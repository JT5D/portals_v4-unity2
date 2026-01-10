import { db } from '../config/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy, Timestamp, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { uploadToR2, R2_PUBLIC_BASE } from './storage/r2';
// import * as FileSystem from 'expo-file-system'; // Deprecated API access
// Use legacy import as suggested by Expo 52+ warnings
import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';

export type LibraryAssetType = '3d' | 'image' | 'video' | 'audio';

export interface LibraryItem {
    id: string;
    userId: string;
    type: LibraryAssetType;
    name: string;
    r2Key: string;          // Main file key
    url: string;            // Public URL
    thumbnailKey?: string;  // Optional thumbnail key
    thumbnailUrl?: string;  // Public thumbnail URL
    size: number;
    mimeType: string;
    createdAt: number;      // Timestamp millis
    metadata?: Record<string, any>;
}

const ACCEPTED_MIME_TYPES: Record<LibraryAssetType, string[]> = {
    '3d': ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'], // .glb, .gltf
    'image': ['image/jpeg', 'image/png', 'image/webp'],
    'video': ['video/mp4', 'video/quicktime'], // .mp4, .mov
    'audio': ['audio/mpeg', 'audio/wav', 'audio/x-m4a'], // .mp3, .wav, .m4a
};

// Helper to validate extensions locally if mime type is generic
const ACCEPTED_EXTENSIONS: Record<LibraryAssetType, string[]> = {
    '3d': ['glb', 'gltf', 'vrx'],
    'image': ['jpg', 'jpeg', 'png', 'webp'],
    'video': ['mp4', 'mov'],
    'audio': ['mp3', 'wav', 'm4a'],
};

class LibraryService {

    /**
     * uploadAsset
     * Uploads file to R2 and saves metadata to Firestore
     */
    async uploadAsset(
        userId: string,
        fileUri: string,
        type: LibraryAssetType,
        originalFilename: string,
        thumbnailUri?: string
    ): Promise<LibraryItem> {
        const id = uuidv4();
        const extension = originalFilename.split('.').pop()?.toLowerCase() || '';

        // Basic validation
        if (!this.isValidFormat(extension, type)) {
            throw new Error(`Unsupported file format: .${extension} for ${type}`);
        }

        // 1. Upload Main File
        const r2Key = `portals/library/${userId}/${type}/${id}.${extension}`;
        // Determine mime type simplistically or use generic
        const mimeType = this.getMimeType(extension, type);

        console.log(`[LibraryService] Uploading ${type} asset: ${r2Key}`);
        await uploadToR2(fileUri, r2Key, mimeType);

        // 2. Upload Thumbnail (if provided)
        let thumbnailKey: string | undefined;
        if (thumbnailUri) {
            thumbnailKey = `portals/library/${userId}/${type}/${id}_thumb.jpg`;
            await uploadToR2(thumbnailUri, thumbnailKey, 'image/jpeg');
        }

        // 3. Create Metadata
        const item: LibraryItem = {
            id,
            userId,
            type,
            name: originalFilename,
            r2Key,
            url: `${R2_PUBLIC_BASE}/${r2Key}`,
            // Firestore doesn't like 'undefined' field values. Use null or omit.
            // Spreading to omit undefined keys
            ...(thumbnailKey ? { thumbnailKey } : {}),
            ...(thumbnailKey ? { thumbnailUrl: `${R2_PUBLIC_BASE}/${thumbnailKey}` } : {}),
            size: await this.getFileSize(fileUri),
            mimeType,
            createdAt: Date.now(),
        };

        console.log(`[LibraryService] Metadata prepared. ID: ${id}, Size: ${item.size}`);

        // 4. Save to Firestore
        // Path: users/{userId}/library/{itemId}
        try {
            // Ensure no undefined values are passed to Firestore
            const firestoreItem = JSON.parse(JSON.stringify(item)); // Bruteforce remove undefined if any remain
            console.log('[LibraryService] Saving to Firestore:', JSON.stringify(firestoreItem, null, 2));
            await setDoc(doc(db, 'users', userId, 'library', id), firestoreItem);
            console.log('[LibraryService] Firestore save success');
        } catch (e) {
            console.error('[LibraryService] Firestore Save Error:', e);
            throw e;
        }

        return item;
    }

    /**
     * fetchLibrary
     * Get all assets for a user, optional filter by type
     */
    async fetchLibrary(userId: string, type?: LibraryAssetType): Promise<LibraryItem[]> {
        const libraryRef = collection(db, 'users', userId, 'library');
        let q;

        if (type) {
            q = query(libraryRef, where('type', '==', type), orderBy('createdAt', 'desc'));
        } else {
            q = query(libraryRef, orderBy('createdAt', 'desc'));
        }

        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => d.data() as LibraryItem);
        } catch (error: any) {
            // Fallback for missing index: Fetch unsorted, then sort client-side
            if (error.code === 'failed-precondition') {
                console.warn('[LibraryService] Index missing. Falling back to client-side sort.');
                const qSimple = type
                    ? query(libraryRef, where('type', '==', type))
                    : libraryRef; // Fetch all if no type filter

                const snapshot = await getDocs(qSimple);
                const items = snapshot.docs.map(d => d.data() as LibraryItem);

                // Sort by createdAt desc
                return items.sort((a, b) => b.createdAt - a.createdAt);
            }
            throw error;
        }
    }

    /**
     * deleteAssets
     * Deletes multiple assets from Firestore (R2 deletion not implemented for MVP as direct R2 delete requires Secret Key which is backend-only typically)
     * For now, we orphan the R2 files or would need a backend function. 
     * NOTE: Client-side R2 deletion isn't safe if we don't expose keys. We'll just delete Firestore reference for now.
     */
    async deleteAssets(userId: string, itemIds: string[]): Promise<void> {
        // 1. Fetch items to get R2 keys
        const itemsToDelete: LibraryItem[] = [];
        for (const id of itemIds) {
            const docRef = doc(db, 'users', userId, 'library', id);
            // We need to fetch it to know the key
            const snapshot = await getDocs(query(collection(db, 'users', userId, 'library'), where('id', '==', id)));
            if (!snapshot.empty) {
                itemsToDelete.push(snapshot.docs[0].data() as LibraryItem);
            }
        }

        // 2. Delete from R2 (both main file and thumbnail)
        const deletionPromises = itemsToDelete.flatMap(item => {
            const tasks = [import('./storage/r2').then(m => m.deleteFromR2(item.r2Key))];
            if (item.thumbnailKey) {
                tasks.push(import('./storage/r2').then(m => m.deleteFromR2(item.thumbnailKey!)));
            }
            return tasks;
        });

        await Promise.allSettled(deletionPromises); // Proceed even if some R2 deletes fail (orphaned files better than broken app)

        // 3. Delete from Firestore
        const batchPromises = itemIds.map(id =>
            deleteDoc(doc(db, 'users', userId, 'library', id))
        );
        await Promise.all(batchPromises);
        console.log(`[LibraryService] Deleted ${itemIds.length} items from R2 and Firestore`);
    }

    /**
     * listenToLibrary
     * Real-time listener for library changes
     */
    listenToLibrary(userId: string, type: LibraryAssetType | undefined, callback: (items: LibraryItem[]) => void): Unsubscribe {
        const libraryRef = collection(db, 'users', userId, 'library');
        let q;

        if (type) {
            q = query(libraryRef, where('type', '==', type), orderBy('createdAt', 'desc'));
        } else {
            q = query(libraryRef, orderBy('createdAt', 'desc'));
        }

        // Wrapper to manage the active unsubscribe function
        // We use an object to hold the reference because the error callback is async
        let activeUnsubscribe: Unsubscribe = () => { };

        const setupListener = (queryToUse: any, isRetry = false) => {
            return onSnapshot(queryToUse, (snapshot: any) => {
                const items = snapshot.docs.map((d: any) => d.data() as LibraryItem);
                // If this is a fallback (simple query), we must sort client-side
                if (isRetry) {
                    items.sort((a: LibraryItem, b: LibraryItem) => b.createdAt - a.createdAt);
                }
                callback(items);
            }, (error: any) => {
                console.error('[LibraryService] Listener error:', error);

                // Fallback for missing index
                if (error.code === 'failed-precondition' && !isRetry) {
                    console.warn('[LibraryService] Index missing. Retrying with simpler query...');
                    const qSimple = type
                        ? query(libraryRef, where('type', '==', type))
                        : libraryRef;

                    // Switch to the new listener
                    activeUnsubscribe = setupListener(qSimple, true);
                }
            });
        };

        activeUnsubscribe = setupListener(q);

        // Return a function that calls the current unsubscribe
        return () => activeUnsubscribe();
    }

    // --- Helpers ---

    private isValidFormat(ext: string, type: LibraryAssetType): boolean {
        return ACCEPTED_EXTENSIONS[type].includes(ext);
    }

    private getMimeType(ext: string, type: LibraryAssetType): string {
        // Simple mapping
        const map: Record<string, string> = {
            'glb': 'model/gltf-binary',
            'gltf': 'model/gltf+json',
            'vrx': 'application/octet-stream',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'm4a': 'audio/x-m4a',
        };
        return map[ext] || 'application/octet-stream';
    }

    private async getFileSize(uri: string): Promise<number> {
        try {
            // Attempt to use getInfoAsync. If it throws deprecation error, catch it.
            // If we really need size, we might need to use the new API or a different method.
            // For now, return 0 if it fails.
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists) {
                return info.size;
            }
        } catch (e: any) {
            console.warn('[LibraryService] Failed to get file size:', e.message);
            // Ignore error and return 0
        }
        return 0;
    }
}

export const libraryService = new LibraryService();
