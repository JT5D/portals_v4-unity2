import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Credentials (In a real app, strict NO-NO. Prototype only.)
const R2_ACCOUNT_ID = "79a6ed38798d77eccd49aeba5b49cd1e";
const R2_ACCESS_KEY_ID = "5489d4f31b46f984df98234c0d04a6d6";
const R2_SECRET_ACCESS_KEY = "25b8ad2d2f30905ba1f34ce1936b8cedfe6cda02e0381b9544d85dad33a53b16";
const R2_BUCKET_NAME = "portals";

// Public URL base for R2 assets (via Cloudflare CDN)
export const R2_PUBLIC_BASE = "https://pub-e804e6eafc2a40ff80713d15ef76076e.r2.dev";

// Initialize S3 Client targeting Cloudflare R2
export const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export const getBucketName = () => R2_BUCKET_NAME;

/**
 * Deletes an object from R2 bucket
 * @param key The key of the object to delete
 */
export async function deleteFromR2(key: string) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });
        await r2Client.send(command);
        console.log(`[R2] Deleted object: ${key}`);
    } catch (error) {
        console.error(`[R2] Error deleting object: ${key}`, error);
        throw error;
    }
}

/**
 * Generates a presigned URL for uploading a file to R2.
 * @param key Storage key (path)
 * @param contentType MIME type of the file
 */
export async function getUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Generates a presigned URL for downloading/viewing a file from R2.
 * @param key Storage key (path)
 */
export async function getDownloadUrl(key: string) {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * Uploads a file directly to R2 using a presigned URL.
 * NOTE: For React Native, 'uri' usually points to a local file system path.
 * We fetch the blob from the URI and PUT it to the signed URL.
 */
export async function uploadToR2(uri: string, key: string, contentType: string) {
    console.log(`[R2] Preparing upload for ${key}`);
    try {
        // 1. Get Presigned URL
        console.log(`[R2] Getting presigned URL for ${key}...`);
        const uploadUrl = await getUploadUrl(key, contentType);
        console.log(`[R2] Got presigned URL, fetching file...`);

        // 2. Fetch the file data
        const response = await fetch(uri);
        const blob = await response.blob();
        console.log(`[R2] File fetched, size: ${blob.size} bytes, uploading...`);

        // 3. Upload to R2
        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": contentType,
            },
            body: blob,
        });

        console.log(`[R2] Upload response status: ${uploadResponse.status}`);

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`[R2] Upload failed: ${uploadResponse.status} - ${errorText}`);
            throw new Error(`Upload failed with status ${uploadResponse.status} - ${errorText}`);
        }

        console.log(`[R2] Successfully uploaded ${key}`);
        return key;
    } catch (error) {
        console.error("[R2] Upload Error:", error);
        throw error;
    }
}


/**
 * Direct Upload for string content (like JSON), bypassing file fetch.
 */
export async function uploadStringContent(content: string, key: string, contentType: string = 'application/json') {
    console.log(`[R2] Uploading string content to ${key} (${content.length} chars)`);
    try {
        console.log(`[R2] Getting presigned URL for ${key}...`);
        const uploadUrl = await getUploadUrl(key, contentType);
        console.log(`[R2] Got presigned URL, uploading...`);

        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": contentType,
            },
            body: content,
        });

        console.log(`[R2] Upload response status: ${uploadResponse.status}`);

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`[R2] Upload failed: ${uploadResponse.status} - ${errorText}`);
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        console.log(`[R2] Successfully uploaded string content to ${key}`);
        return key;
    } catch (e) {
        console.error("[R2] String Upload Error:", e);
        throw e;
    }
}

