export declare namespace BlobStorage {
    /** The base url for the blob storage.
     * The expected endpoints are:
     * - POST `/api/needle/blob` - to request a new upload url
     */
    export const baseUrl: string | undefined;
    /**
     * Generates an md5 hash from a given buffer
     * @param buffer The buffer to hash
     * @returns The md5 hash
     */
    export function hashMD5(buffer: ArrayBuffer): string;
    export function hashMD5_Base64(buffer: ArrayBuffer): string;
    export function hashSha256(buffer: ArrayBuffer): Promise<string>;
    export type Upload_Result = {
        readonly key: string | null;
        readonly success: boolean;
        readonly download_url: string | null;
    };
    /**
     * Checks if the current user can upload a file of the given size
     * @param info The file info
     */
    export function canUpload(info: {
        filesize: number;
    }): boolean;
    type CustomFile = {
        name: string;
        data: ArrayBuffer;
        type?: string;
    };
    type UploadOptions = {
        /** Allows to abort the upload. See AbortController */
        abort?: AbortSignal;
        /** When set to `true` no balloon messages will be displayed on screen */
        silent?: boolean;
        /** Called when the upload starts and is finished */
        onProgress?: (progress: {
            progress01: number;
            state: "inprogress" | "finished";
        }) => void;
    };
    export function upload(file: CustomFile, opts?: UploadOptions): Promise<Upload_Result | null>;
    export function upload(file: File, opts?: UploadOptions): Promise<Upload_Result | null>;
    export function getBlobUrlForKey(key: string): string;
    export function download(url: string, progressCallback?: (prog: ProgressEvent) => void): Promise<Uint8Array | null>;
    export {};
}
