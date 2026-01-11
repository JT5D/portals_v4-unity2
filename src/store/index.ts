import { create } from 'zustand';
import { Post, User, Notification, Comment, Draft, User as UserType } from '../types';
import { POSTS, CURRENT_USER, NOTIFICATIONS, DRAFTS, COMMENTS } from '../mock';
import { collection, query, orderBy, getDocs, limit, deleteDoc, doc, addDoc, setDoc, where, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from '../services/notifications';

// Voice Context
interface VoiceContext {
    currentScreen: string;
    currentId?: string; // postId or userId
    currentType?: 'post' | 'profile' | 'feed' | 'other';
}

interface AppState {
    // Session
    currentUser: User | null;
    isAuthenticated: boolean;
    setAuthenticated: (value: boolean) => void;
    setCurrentUser: (user: User | null) => void;
    login: () => void;
    logout: () => void;
    updateProfile: (updates: Partial<User>) => void;

    // Feed
    feed: Post[];
    toggleLike: (postId: string) => Promise<void>;
    addPost: (post: Post) => void;
    fetchFeed: () => Promise<void>;
    createPost: (post: Omit<Post, 'id' | 'likes' | 'comments' | 'timestamp'>) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;

    // Comments
    comments: Record<string, Comment[]>; // Map postId to comments
    addComment: (postId: string, text: string) => Promise<void>;
    addReply: (postId: string, parentCommentId: string, reply: Comment) => void;
    pendingComment: { postId: string; text: string } | null;
    setPendingComment: (pending: { postId: string; text: string } | null) => void;

    // Notifications
    notifications: Notification[];
    setNotifications: (notifications: Notification[]) => void;
    respondToRequest: (notificationId: string, status: 'accepted' | 'declined') => void;
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;

    // Notification Selection Mode
    selectedNotificationIds: Set<string>;
    isSelectionMode: boolean;
    enterSelectionMode: () => void;
    exitSelectionMode: () => void;
    toggleNotificationSelection: (id: string) => void;
    selectAllNotifications: () => void;
    clearSelection: () => void;
    deleteSelectedNotifications: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    markAllAsReadAndClear: () => Promise<void>;

    // Social Relationships
    relationships: {
        team: string[];
        invites: string[];
        friends: string[];
        following: string[];
        blocked: string[];
    };
    sendInvite: (userId: string) => void;
    approveInvite: (userId: string) => void;
    rejectInvite: (userId: string) => void;
    removeTeamMember: (userId: string) => void;
    followUser: (userId: string) => void;
    unfollowUser: (userId: string) => void;
    fetchFollowing: () => Promise<void>;
    followingUsers: User[];
    fetchFollowingUsers: () => Promise<void>;

    // Drafts
    drafts: Draft[];
    draftPost: Partial<Post> | null;
    setDraftPost: (draft: Partial<Post> | null) => void;
    saveDraft: (sceneData: any, coverImage?: string) => Promise<string | undefined>;
    saveWorld: (sceneData: any, coverImage: string) => Promise<{ sceneId: string; imageUrl: string } | undefined>;
    fetchDrafts: () => Promise<void>;
    deleteDraft: (id: string) => Promise<void>;
    updateDraftPost: (updates: Partial<Post>) => void;
    loadDraft: (draft: Draft) => Promise<void>;

    // Voice
    isVoiceActive: boolean;
    setVoiceActive: (active: boolean) => void;
    voiceContext: VoiceContext;
    setVoiceContext: (context: Partial<VoiceContext>) => void;

    // Collaboration
    sendCollaborationInvite: (draftId: string, userId: string, draftTitle?: string) => Promise<void>;
    respondToCollabInvite: (notificationId: string, draftId: string, inviterId: string, draftTitle: string, accepted: boolean) => Promise<void>;

    // Collected Artifacts
    collectedArtifacts: Post[];
    collectArtifact: (post: Post) => Promise<void>;
    fetchCollectedArtifacts: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
    // Session
    currentUser: null,
    isAuthenticated: false,
    setAuthenticated: (value) => set({ isAuthenticated: value }),
    setCurrentUser: (user) => set({ currentUser: user }),
    login: () => set({ isAuthenticated: true, currentUser: CURRENT_USER }),
    logout: () => set({ isAuthenticated: false, currentUser: null }),
    updateProfile: (updates) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null
    })),

    // Feed
    feed: POSTS,
    toggleLike: async (postId) => {
        const state = get();
        const post = state.feed.find(p => p.id === postId);
        if (!post || !state.currentUser) return;

        const isLiked = post.isLiked;
        // Optimistic Update
        set((state) => ({
            feed: state.feed.map((p) =>
                p.id === postId
                    ? { ...p, isLiked: !isLiked, likes: isLiked ? p.likes - 1 : p.likes + 1 }
                    : p
            )
        }));

        // Persist to Firestore
        try {
            const { FeedService } = await import('../services/feed');
            await FeedService.toggleLike(postId, state.currentUser.id, isLiked);

            // Send notification on like (not unlike) and not on own post
            if (!isLiked && post.userId !== state.currentUser.id) {
                const { NotificationService } = await import('../services/notifications');
                await NotificationService.sendLikeNotification(state.currentUser, post);
            }
        } catch (error) {
            console.error('[Store] Error toggling like:', error);
            // Revert on failure
            set((state) => ({
                feed: state.feed.map((p) =>
                    p.id === postId
                        ? { ...p, isLiked: isLiked, likes: isLiked ? p.likes : p.likes - 1 }
                        : p
                )
            }));
        }
    },
    addPost: (post) => set((state) => ({ feed: [post, ...state.feed] })),
    fetchFeed: async () => {
        try {
            console.log("[Store] Fetching feed from Firestore...");
            const state = get();
            let querySnapshot;

            try {
                // Try sorted query
                const q = query(
                    collection(db, "posts"),
                    orderBy("createdAt", "desc"),
                    limit(20)
                );
                querySnapshot = await getDocs(q);
            } catch (err: any) {
                console.warn("[Store] Sorted query failed (likely missing index), falling back to unsorted.", err.message);
                const fallbackQ = query(collection(db, "posts"), limit(20));
                querySnapshot = await getDocs(fallbackQ);
            }

            const posts: Post[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                posts.push({
                    id: doc.id,
                    userId: data.userId,
                    user: data.user,
                    caption: data.caption,
                    likes: data.likes || 0,
                    comments: data.comments || 0,
                    shares: data.shares || 0,
                    isLiked: false, // Will be checked below
                    date: data.date,
                    tags: data.tags || [],
                    taggedUsers: data.taggedUsers || [],
                    locations: data.locations || [],
                    category: data.category || 'Feed',
                    music: data.music || 'Original Sound',
                    mediaUri: data.mediaUri,
                    coverImage: data.coverImage,
                    sceneId: data.sceneId,
                    sceneData: data.sceneData,
                    isArtifact: data.isArtifact || false, // CRITICAL: Include artifact status for routing and UI
                    portalSettings: data.portalSettings || null, // Portal gamification settings
                } as Post);
            });

            // Check like status for each post (in parallel for performance)
            if (state.currentUser) {
                const { FeedService } = await import('../services/feed');
                await Promise.all(
                    posts.map(async (post) => {
                        post.isLiked = await FeedService.checkIsLiked(post.id, state.currentUser!.id);
                    })
                );
            }

            // Filter out mystery portals, posts with rarity tiers, and posts with signal modes
            // These are map-only experiences and should not appear in the regular feed
            console.log(`[Store] Fetched ${posts.length} posts.`);
            if (posts.length > 0) {
                set({ feed: posts });
            } else {
                console.log("[Store] No posts found.");
            }

            // Also fetch following list to enable Friends feed filter
            await get().fetchFollowing();
        } catch (e) {
            console.error("[Store] Error fetching feed:", e);
        }
    },
    createPost: async (post) => { }, // Placeholder
    deletePost: async (postId) => {
        try {
            console.log(`[Store] Deleting post ${postId}...`);
            await deleteDoc(doc(db, "posts", postId));
            set((state) => ({
                feed: state.feed.filter((p) => p.id !== postId)
            }));
            console.log(`[Store] Deleted post ${postId}`);
        } catch (e) {
            console.error("[Store] Error deleting post:", e);
        }
    },

    // Comments
    comments: { 'p1': COMMENTS }, // Initialize with mock comments mapped to p1 for demo
    addComment: async (postId, text) => {
        console.log(`[Store] Adding comment to ${postId}: ${text}`);
        const state = get();
        if (!state.currentUser) return;

        // Optimistically update the feed count
        set((s) => ({
            feed: s.feed.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p)
        }));

        // Persist to Firestore
        try {
            const { FeedService } = await import('../services/feed');
            await FeedService.addComment(
                postId,
                state.currentUser.id,
                text,
                state.currentUser.avatar || '',
                state.currentUser.username
            );
        } catch (error) {
            console.error('[Store] Error adding comment:', error);
            // Revert on failure
            set((s) => ({
                feed: s.feed.map(p => p.id === postId ? { ...p, comments: p.comments - 1 } : p)
            }));
        }
    },
    addReply: (postId, parentCommentId, reply) => set((state) => {
        const postComments = state.comments[postId] || [];
        const updatedComments = postComments.map(c => {
            if (c.id === parentCommentId) {
                return { ...c, replies: [...(c.replies || []), reply] };
            }
            return c;
        });

        return {
            comments: {
                ...state.comments,
                [postId]: updatedComments
            },
            feed: state.feed.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p)
        };
    }),
    pendingComment: null,
    setPendingComment: (pending) => set({ pendingComment: pending }),

    // Notifications (start empty, subscribe to Firestore)
    notifications: [],
    setNotifications: (notifications) => set({ notifications }),
    respondToRequest: (id, status) => set((state) => ({
        notifications: state.notifications.map(n =>
            n.id === id ? { ...n, actionStatus: status } : n
        )
    })),
    addNotification: (n) => set((state) => ({ notifications: [n, ...state.notifications] })),
    markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    })),
    markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
    })),

    // Notification Selection Mode
    selectedNotificationIds: new Set(),
    isSelectionMode: false,
    enterSelectionMode: () => set({ isSelectionMode: true }),
    exitSelectionMode: () => set({ isSelectionMode: false, selectedNotificationIds: new Set() }),
    toggleNotificationSelection: (id) => set((state) => {
        const newSet = new Set(state.selectedNotificationIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return { selectedNotificationIds: newSet };
    }),
    selectAllNotifications: () => set((state) => ({
        selectedNotificationIds: new Set(state.notifications.map(n => n.id))
    })),
    clearSelection: () => set({ selectedNotificationIds: new Set() }),
    deleteSelectedNotifications: async () => {
        const state = get();
        if (!state.currentUser || state.selectedNotificationIds.size === 0) return;

        try {
            const idsToDelete = Array.from(state.selectedNotificationIds);
            await NotificationService.deleteNotifications(state.currentUser.id, idsToDelete);

            // Optimistic update
            set((s) => ({
                notifications: s.notifications.filter(n => !idsToDelete.includes(n.id)),
                selectedNotificationIds: new Set(),
                isSelectionMode: false,
            }));
        } catch (error) {
            console.error('[Store] Error deleting notifications:', error);
        }
    },
    deleteNotification: async (id) => {
        const state = get();
        if (!state.currentUser) return;

        try {
            await NotificationService.deleteNotification(state.currentUser.id, id);
            set((s) => ({
                notifications: s.notifications.filter(n => n.id !== id)
            }));
        } catch (error) {
            console.error('[Store] Error deleting notification:', error);
        }
    },
    markAllAsReadAndClear: async () => {
        const state = get();
        if (!state.currentUser) return;

        try {
            await NotificationService.markAllAsRead(state.currentUser.id);
            set((s) => ({
                notifications: s.notifications.map(n => ({ ...n, read: true }))
            }));
        } catch (error) {
            console.error('[Store] Error marking all as read:', error);
        }
    },

    // Social Relationships
    relationships: {
        team: [],
        invites: ['u2', 'u3', 'u4'], // Mock: Everyone invited us for demo
        friends: ['u3'],
        following: ['u3', 'u4'],
        blocked: []
    },
    sendInvite: (userId) => set((state) => ({
        relationships: { ...state.relationships, invites: [...state.relationships.invites, userId] } // Self-invite? Or outgoing? Assuming incoming for this demo context or we just add to team? 
        // Real app would send API request.
    })),
    approveInvite: (userId) => set((state) => ({
        relationships: {
            ...state.relationships,
            invites: state.relationships.invites.filter(id => id !== userId),
            team: [...state.relationships.team, userId]
        }
    })),
    rejectInvite: (userId) => set((state) => ({
        relationships: {
            ...state.relationships,
            invites: state.relationships.invites.filter(id => id !== userId),
            blocked: [...state.relationships.blocked, userId] // Optional: Add to blocked or just remove
        }
    })),
    removeTeamMember: (userId) => set((state) => ({
        relationships: {
            ...state.relationships,
            team: state.relationships.team.filter(id => id !== userId)
        }
    })),
    followUser: (userId) => set((state) => ({
        relationships: {
            ...state.relationships,
            following: [...state.relationships.following, userId]
        }
    })),
    unfollowUser: (userId) => set((state) => ({
        relationships: {
            ...state.relationships,
            following: state.relationships.following.filter(id => id !== userId)
        }
    })),
    fetchFollowing: async () => {
        const state = get();
        if (!state.currentUser) return;

        try {
            const followingRef = collection(db, 'users', state.currentUser.id, 'following');
            const snapshot = await getDocs(followingRef);
            const followingIds = snapshot.docs.map(doc => doc.id);

            set((prevState) => ({
                relationships: {
                    ...prevState.relationships,
                    following: followingIds
                }
            }));
            console.log(`[Store] Fetched ${followingIds.length} following users.`);
        } catch (e) {
            console.error('[Store] Error fetching following list:', e);
        }
    },
    followingUsers: [],
    fetchFollowingUsers: async () => {
        const state = get();
        if (!state.currentUser) return;

        try {
            // First get following IDs if not loaded
            if (state.relationships.following.length === 0) {
                await state.fetchFollowing();
            }

            const followingIds = get().relationships.following;
            if (followingIds.length === 0) {
                set({ followingUsers: [] });
                return;
            }

            // Fetch user docs for each following ID
            const users: User[] = [];
            for (const userId of followingIds) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        users.push({
                            id: userDoc.id,
                            username: data.username || 'Unknown',
                            displayName: data.displayName || data.username || 'Unknown',
                            avatar: data.avatar || 'https://i.pravatar.cc/150',
                            bio: data.bio || '',
                            followers: data.followers || 0,
                            following: data.following || 0,
                            friends: data.friends || 0,
                            flames: data.flames || 0,
                            isVerified: data.isVerified || false,
                        } as User);
                    }
                } catch (e) {
                    console.warn(`[Store] Failed to fetch user ${userId}:`, e);
                }
            }

            set({ followingUsers: users });
            console.log(`[Store] Fetched ${users.length} following user details.`);
        } catch (e) {
            console.error('[Store] Error fetching following users:', e);
        }
    },

    // Drafts
    drafts: DRAFTS,
    draftPost: null,
    setDraftPost: (draft) => set({ draftPost: draft }),
    updateDraftPost: (updates) => set((state) => ({
        draftPost: state.draftPost ? { ...state.draftPost, ...updates } : updates
    })),
    loadDraft: async (draft) => {
        try {
            console.log("[Store] Loading draft...", draft.id);
            let fullSceneData = draft.sceneData;

            // version 2: sceneData is missing, fetch from R2 via sceneId
            if (!fullSceneData && draft.sceneId) {
                console.log("[Store] Fetching heavy scene data from R2...");
                const { getDownloadUrl, R2_PUBLIC_BASE } = require('../services/storage/r2');

                // The storageKey in Firestore already contains the full path
                // We need to get the scene document to find the storageKey
                const { db } = require('../config/firebase');
                const { doc, getDoc } = require('firebase/firestore');

                const sceneDoc = await getDoc(doc(db, 'scenes', draft.sceneId));
                if (!sceneDoc.exists()) {
                    console.error("[Store] Scene document not found:", draft.sceneId);
                    return;
                }

                const sceneData = sceneDoc.data();
                const storageKey = sceneData.storageKey;
                console.log("[Store] Using storageKey from Firestore:", storageKey);

                // Try public URL first, fall back to signed URL if needed
                const publicUrl = `${R2_PUBLIC_BASE}/${storageKey}`;
                console.log("[Store] Trying public URL:", publicUrl);

                const res = await fetch(publicUrl);
                if (!res.ok) {
                    console.log("[Store] Public URL failed, trying signed URL...");
                    const signedUrl = await getDownloadUrl(storageKey);
                    const signedRes = await fetch(signedUrl);
                    fullSceneData = await signedRes.json();
                } else {
                    fullSceneData = await res.json();
                }
                console.log("[Store] Scene data loaded.");
            }

            // --- Recursive Resolution of R2 Keys ---
            if (fullSceneData && typeof fullSceneData === 'object') {
                const { getDownloadUrl } = require('../services/storage/r2');

                // Helper to walk the JSON tree
                const resolveNode = async (node: any) => {
                    if (!node) return;

                    if (Array.isArray(node)) {
                        await Promise.all(node.map(child => resolveNode(child)));
                    } else if (typeof node === 'object') {
                        // Check known texture slots or iterate all values? 
                        // Iterating all keys is safer for nested materials
                        const keys = Object.keys(node);
                        await Promise.all(keys.map(async (key) => {
                            const value = node[key];
                            if (typeof value === 'string' && value.startsWith('r2://')) {
                                const storageKey = value.replace('r2://', '');
                                try {
                                    const signed = await getDownloadUrl(storageKey);
                                    node[key] = signed;
                                } catch (e) {
                                    console.warn("Failed to sign URL for", storageKey);
                                }
                            } else if (typeof value === 'object') {
                                await resolveNode(value);
                            }
                        }));
                    }
                };

                await resolveNode(fullSceneData.objects); // Only resolve objects array to limit scope
            }

            set({
                draftPost: {
                    ...draft,
                    sceneData: fullSceneData
                } as any // Cast because Post might not perfectly align with Draft but close enough for Composer
            });
        } catch (e) {
            console.error("[Store] Error loading draft:", e);
        }
    },
    saveDraft: async (sceneData, coverImage) => {
        try {
            console.log("[Store] Saving scene (unified draft/scene)...");
            const state = get();
            const userId = state.currentUser?.id || 'anonymous';

            // Save directly to scenes collection (no separate drafts anymore)
            const { saveSceneToStorage } = require('../services/sceneSaver');
            const result = await saveSceneToStorage(
                {
                    ...sceneData,
                    status: 'draft', // Mark as draft
                },
                coverImage,
                userId
            );

            const { sceneId, revision, collaborators, ownerId } = result;
            console.log("[Store] Scene saved successfully:", sceneId, "revision:", revision);

            // Notify all collaborators AND owner (except self) about the update
            if (state.currentUser && (collaborators?.length > 0 || ownerId)) {
                const allCollaborators = [...(collaborators || [])];
                // Include owner if current user is a collaborator (not the owner)
                if (ownerId && ownerId !== state.currentUser.id && !allCollaborators.includes(ownerId)) {
                    allCollaborators.push(ownerId);
                }

                if (allCollaborators.length > 0) {
                    await NotificationService.sendCollabUpdateNotification(
                        state.currentUser,
                        allCollaborators,
                        sceneId,
                        sceneData.title || 'Untitled Scene',
                        revision || 1
                    );
                }
            }

            // Refresh drafts list
            await state.fetchDrafts();

            return sceneId; // Return sceneId so caller can update Redux
        } catch (e) {
            console.error("[Store] Error saving scene:", e);
            return undefined;
        }
    },
    saveWorld: async (sceneData, coverImage) => {
        try {
            console.log("[Store] Saving world scene...");
            const state = get();
            const userId = state.currentUser?.id;
            if (!userId) {
                console.error("[Store] No user logged in");
                return undefined;
            }

            // Save scene with isWorld flag
            const { saveSceneToStorage } = require('../services/sceneSaver');
            const result = await saveSceneToStorage(
                {
                    ...sceneData,
                    status: 'world', // Special status for world scenes
                    isWorld: true,
                },
                coverImage,
                userId
            );

            const { sceneId, previewUrl } = result;
            console.log("[Store] World scene saved:", sceneId, "preview:", previewUrl);

            // Update user document with world info
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                worldSceneId: sceneId,
                worldBackground: previewUrl || null,
            });

            // Update local currentUser state
            if (state.currentUser) {
                set({
                    currentUser: {
                        ...state.currentUser,
                        worldSceneId: sceneId,
                        worldBackground: previewUrl,
                    } as User
                });
            }

            console.log("[Store] User document updated with world info");
            return { sceneId, imageUrl: previewUrl || '' };
        } catch (e) {
            console.error("[Store] Error saving world:", e);
            return undefined;
        }
    },
    fetchDrafts: async () => {
        try {
            const state = get();
            if (!state.currentUser) return;

            console.log("[Store] Fetching drafts from scenes collection...");

            // Fetch owned draft scenes
            const qOwned = query(
                collection(db, "scenes"),
                where("ownerId", "==", state.currentUser.id),
                where("status", "==", "draft"),
                orderBy("updatedAt", "desc")
            );

            // Fetch shared draft scenes (no orderBy to avoid composite index requirement)
            const qShared = query(
                collection(db, "scenes"),
                where("collaborators", "array-contains", state.currentUser.id),
                where("status", "==", "draft")
            );

            console.log("[Store] Querying scenes for user:", state.currentUser.id);

            const results = await Promise.allSettled([
                getDocs(qOwned),
                getDocs(qShared)
            ]);

            const draftsMap = new Map<string, Draft>();

            // Process Owned Scenes (as drafts)
            if (results[0].status === 'fulfilled') {
                console.log("[Store] Owned drafts found:", results[0].value.docs.length);
                results[0].value.forEach(doc => {
                    const data = doc.data();
                    const coverImage = data.previewPath ? `https://pub-e804e6eafc2a40ff80713d15ef76076e.r2.dev/${data.previewPath}` : null;
                    console.log('[Store] Draft data:', { id: doc.id, title: data.title, previewPath: data.previewPath, coverImage });
                    // Map scene fields to draft interface
                    draftsMap.set(doc.id, {
                        id: doc.id,
                        sceneId: doc.id, // Scene ID is the doc ID now
                        title: data.title || 'Untitled',
                        coverImage,
                        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                        createdAt: data.createdAt?.toDate?.()?.toISOString(),
                        collaborators: data.collaborators || [],
                        ownerId: data.ownerId,
                    } as Draft);
                });
            } else {
                console.error("[Store] Failed to fetch owned drafts:", results[0].reason);
            }

            // Process Shared Scenes (as drafts)
            if (results[1].status === 'fulfilled') {
                console.log("[Store] Shared drafts found:", results[1].value.docs.length);
                results[1].value.forEach(doc => {
                    const data = doc.data();
                    console.log('[Store] Shared draft:', { id: doc.id, title: data.title, collaborators: data.collaborators });
                    draftsMap.set(doc.id, {
                        id: doc.id,
                        sceneId: doc.id,
                        title: data.title || 'Untitled',
                        coverImage: data.previewPath ? `https://pub-e804e6eafc2a40ff80713d15ef76076e.r2.dev/${data.previewPath}` : null,
                        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                        createdAt: data.createdAt?.toDate?.()?.toISOString(),
                        collaborators: data.collaborators || [],
                        ownerId: data.ownerId,
                    } as Draft);
                });
            } else {
                console.warn("[Store] Failed to fetch shared drafts:", results[1].reason);
            }

            const drafts = Array.from(draftsMap.values()).sort((a, b) =>
                (new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
            );

            set({ drafts });
            console.log(`[Store] Fetched ${drafts.length} drafts from scenes.`);
        } catch (e) {
            console.error("[Store] Error fetching drafts:", e);
        }
    },
    deleteDraft: async (id) => {
        try {
            // Delete from scenes collection (not drafts)
            await deleteDoc(doc(db, "scenes", id));
            set(state => ({ drafts: state.drafts.filter(d => d.id !== id) }));
            console.log("[Store] Deleted scene/draft:", id);
        } catch (e) { console.error("Error deleting scene/draft:", e); }
    },

    // Voice
    isVoiceActive: false,
    setVoiceActive: (active) => set({ isVoiceActive: active }),
    voiceContext: { currentScreen: 'Home', currentType: 'feed' },
    setVoiceContext: (context) => set((state) => ({
        voiceContext: { ...state.voiceContext, ...context }
    })),

    // Collaboration
    sendCollaborationInvite: async (draftId, targetUserId, draftTitle = 'Untitled Scene') => {
        try {
            console.log(`[Store] Sending invite for draft ${draftId} to ${targetUserId}`);
            const state = get();

            if (!state.currentUser) {
                console.error('[Store] No current user for sending invite');
                return;
            }

            // Send real Firestore notification to target user
            await NotificationService.sendCollabInviteNotification(
                state.currentUser,
                targetUserId,
                draftId,
                draftTitle
            );

            console.log(`[Store] Collaboration invite sent to ${targetUserId}`);
        } catch (e) {
            console.error("Error sending invite:", e);
        }
    },

    respondToCollabInvite: async (notificationId, draftId, inviterId, draftTitle, accepted) => {
        try {
            const state = get();
            if (!state.currentUser) return;

            console.log(`[Store] Responding to collab invite: ${accepted ? 'ACCEPT' : 'DECLINE'}`);

            // If accepted, add current user to draft's collaborators
            if (accepted && draftId) {
                // Try scenes collection first (new structure), fallback to drafts
                const sceneRef = doc(db, 'scenes', draftId);
                const sceneSnap = await getDoc(sceneRef);

                if (sceneSnap.exists()) {
                    await updateDoc(sceneRef, {
                        collaborators: arrayUnion(state.currentUser.id)
                    });
                    console.log(`[Store] Added ${state.currentUser.id} to collaborators on scene ${draftId}`);
                } else {
                    // Fallback to drafts collection
                    const draftRef = doc(db, 'drafts', draftId);
                    const draftSnap = await getDoc(draftRef);
                    if (draftSnap.exists()) {
                        await updateDoc(draftRef, {
                            collaborators: arrayUnion(state.currentUser.id)
                        });
                        console.log(`[Store] Added ${state.currentUser.id} to collaborators on draft ${draftId}`);
                    }
                }

                // Add inviter to local team relationships
                set((state) => ({
                    relationships: {
                        ...state.relationships,
                        team: [...new Set([...state.relationships.team, inviterId])]
                    }
                }));
                console.log(`[Store] Added inviter ${inviterId} to local team`);

                // Refresh drafts to show the shared draft
                get().fetchDrafts();
            }

            // Send response notification to the inviter
            await NotificationService.sendCollabResponseNotification(
                state.currentUser,
                inviterId,
                accepted,
                draftTitle || 'a scene'
            );

            // Mark the invite notification as read and update its status locally
            await NotificationService.markAsRead(state.currentUser.id, notificationId);
            set((state) => ({
                notifications: state.notifications.map(n =>
                    n.id === notificationId ? { ...n, actionStatus: accepted ? 'accepted' : 'declined', read: true } : n
                )
            }));

            console.log(`[Store] Collab response sent, invite status updated`);
        } catch (e) {
            console.error("Error responding to collab invite:", e);
        }
    },

    // Collected Artifacts
    collectedArtifacts: [],
    collectArtifact: async (post) => {
        const state = get();
        if (!state.currentUser || !post) return;

        try {
            // Check if already collected
            if (state.collectedArtifacts.some(a => a.id === post.id)) {
                console.log('[Store] Artifact already collected:', post.id);
                return;
            }

            // Save to Firestore: users/{userId}/collectedArtifacts/{postId}
            const artifactRef = doc(db, 'users', state.currentUser.id, 'collectedArtifacts', post.id);
            await setDoc(artifactRef, {
                postId: post.id,
                userId: post.userId,
                caption: post.caption,
                coverImage: post.coverImage,
                sceneId: post.sceneId,
                isArtifact: post.isArtifact,
                collectedAt: new Date().toISOString(),
            });

            // Optimistic update
            set((state) => ({
                collectedArtifacts: [...state.collectedArtifacts, post]
            }));

            console.log('[Store] Artifact collected:', post.id);
        } catch (e) {
            console.error('[Store] Error collecting artifact:', e);
        }
    },
    fetchCollectedArtifacts: async () => {
        const state = get();
        if (!state.currentUser) return;

        try {
            const artifactsRef = collection(db, 'users', state.currentUser.id, 'collectedArtifacts');
            const q = query(artifactsRef, orderBy('collectedAt', 'desc'));
            const snapshot = await getDocs(q);

            // For each collected artifact, try to get the full post data from feed
            const collectedIds = snapshot.docs.map(doc => doc.data().postId);
            const collectedPosts = state.feed.filter(p => collectedIds.includes(p.id));

            set({ collectedArtifacts: collectedPosts });
            console.log('[Store] Fetched collected artifacts:', collectedPosts.length);
        } catch (e) {
            console.error('[Store] Error fetching collected artifacts:', e);
        }
    }
}));
