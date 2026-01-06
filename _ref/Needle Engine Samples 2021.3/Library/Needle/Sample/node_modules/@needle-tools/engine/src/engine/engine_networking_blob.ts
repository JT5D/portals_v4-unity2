// workaround for this is not a function when deployed
// see https://github.com/pvorb/node-md5/issues/52
import md5 from "md5";
import { FileLoader } from "three";

import { showBalloonWarning } from "./debug/index.js";
import { hasCommercialLicense } from "./engine_license.js";
import { delay } from "./engine_utils.js";


export namespace BlobStorage {

    const maxSizeInMB = 50;
    const maxFreeSizeInMB = 5;

    /** The base url for the blob storage. 
     * The expected endpoints are:
     * - POST `/api/needle/blob` - to request a new upload url
     */
    export const baseUrl: string | undefined = "https://networking.needle.tools";

    /**
     * Generates an md5 hash from a given buffer
     * @param buffer The buffer to hash
     * @returns The md5 hash
     */
    export function hashMD5(buffer: ArrayBuffer): string {
        return md5(new Uint8Array(buffer))
    }
    export function hashMD5_Base64(buffer: ArrayBuffer): string {
        const bytes = md5(new Uint8Array(buffer), { encoding: "binary", asBytes: true });
        return btoa(String.fromCharCode(...bytes));
    }
    export function hashSha256(buffer: ArrayBuffer): Promise<string> {
        const bytes = new Uint8Array(buffer);
        const hash = crypto.subtle.digest('SHA-256', bytes).then(res => {
            return btoa(String.fromCharCode(...new Uint8Array(res)));
        })
        return hash;
    }

    export type Upload_Result = {
        readonly key: string | null;
        readonly success: boolean;
        readonly download_url: string | null;
    }

    /**
     * Checks if the current user can upload a file of the given size
     * @param info The file info
     */
    export function canUpload(info: { filesize: number }) {
        const sizeInMB = info.filesize / 1024 / 1024;
        if (hasCommercialLicense()) {
            return sizeInMB < maxSizeInMB;
        }
        return sizeInMB < maxFreeSizeInMB;
    }

    declare type UploadResponse = {
        error: string
    } | {
        key: string,
        download: string,
        upload?: string,
    }
    declare type CustomFile = {
        name: string;
        data: ArrayBuffer;
        type?: string;
    }
    declare type UploadOptions = {
        /** Allows to abort the upload. See AbortController */
        abort?: AbortSignal;
        /** When set to `true` no balloon messages will be displayed on screen */
        silent?: boolean;
        /** Called when the upload starts and is finished */
        onProgress?: (progress: { progress01: number, state: "inprogress" | "finished" }) => void;
    }
    export async function upload(file: CustomFile, opts?: UploadOptions): Promise<Upload_Result | null>;
    export async function upload(file: File, opts?: UploadOptions): Promise<Upload_Result | null>;
    export async function upload(file: File | CustomFile, opts?: UploadOptions): Promise<Upload_Result | null> {

        const _baseUrl = baseUrl;
        if (!_baseUrl) {
            console.error("Blob storage base url is not set");
            return null;
        }
        else if (!file.name) {
            console.error("Upload: file name is missing");
            return null;
        }

        let arrayBuffer: ArrayBuffer | null = null;
        if (file instanceof File) {
            arrayBuffer = await file.arrayBuffer();
        } else {
            arrayBuffer = file.data;
        }

        const filesize = arrayBuffer.byteLength;
        const filesizeInMB = filesize / 1024 / 1024;

        if (filesizeInMB > maxSizeInMB) {
            if (opts?.silent !== true) showBalloonWarning(`File (${filesizeInMB.toFixed(1)}MB) is too large for uploading (see console for details)`);
            console.warn(`Your file is too large for uploading (${filesizeInMB.toFixed(1)}MB). Max allowed size is ${maxSizeInMB}MB`);
            return null;
        }
        else if (!hasCommercialLicense() && filesizeInMB > maxFreeSizeInMB) {
            if (opts?.silent !== true) showBalloonWarning(`File is too large for uploading. Please get a <a href=\"https://needle.tools/pricing\" target=\"_blank\">commercial license</a> to upload files larger than 5MB`);
            console.warn(`Your file is too large for uploading (${filesizeInMB.toFixed(1)}MB). Max size is 5MB for non-commercial users. Please get a commercial license at https://needle.tools/pricing for larger files (up to 50MB)`);
            return null;
        }
        else if (filesize < 1) {
            console.warn(`Your file is too small for uploading (${filesizeInMB.toFixed(1)}MB). Min size is 1 byte`);
            return null;
        }

        const hash = hashMD5_Base64(arrayBuffer);

        const headers = {
            filename: file.name,
            "Content-Md5": hash,
            // "x-amz-checksum-sha256": checksum,
            // "X-Amz-Content-Sha256": checksum,
            "Content-Type": file.type || "application/octet-stream",
            "FileSize": filesize.toString(),
            // enforced by the server
            "Content-Disposition": `attachment; filename=\"${file.name}\"`,
            // enforced by the server
            "x-amz-server-side-encryption": "AES256",
        }

        const uploadResult = await fetch(_baseUrl + "/api/needle/blob", {
            method: "POST",
            headers,
            signal: opts?.abort,
        })
            .then(res => res.json())
            .catch(err => {
                console.error(err);
                return null;
            }) as UploadResponse | null;

        if (uploadResult == null) {
            console.warn("Upload failed...");
            return null;
        }
        else if ("error" in uploadResult) {
            console.error(uploadResult.error);
            return null;
        }
        // If the server responded with a upload url, we can now upload the file
        else if ("upload" in uploadResult && uploadResult.upload) {
            console.debug("Uploading file", uploadResult.upload);
            let didUpload = false;
            let error: Error | null = null;
            // try uploading the file 5 times
            for (let i = 0; i < 3; i++) {
                try {
                    if (didUpload) break;
                    if (opts?.abort?.aborted) {
                        console.debug("Aborted upload");
                        return null;
                    }
                    const res = await tryUpload(uploadResult.upload);
                    if (res instanceof Error) {
                        error = res;
                        await delay(1000 * i);
                    }
                    else if (res.ok) {
                        console.debug("File uploaded successfully");
                        didUpload = true;
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            if (!didUpload) {
                console.error(error?.message || "Failed to upload file");
                return null;
            }

            function tryUpload(url: string): Promise<Response | Error> {
                opts?.onProgress?.call(null, { progress01: 0, state: "inprogress" });
                const uploadRes = fetch(url, {
                    method: "PUT",
                    headers,
                    body: arrayBuffer,
                    signal: opts?.abort,
                })
                    .then(res => {
                        opts?.onProgress?.call(null, { progress01: 1, state: "finished" });
                        return res;
                    })
                    .catch(err => {
                        return err as Error;
                    });
                return uploadRes;
            }
        }

        // Provide the download url to the caller
        if ("download" in uploadResult) {
            const downloadUrl = _baseUrl + uploadResult.download;
            console.debug("File found in blob storage", downloadUrl);
            return {
                key: uploadResult.key,
                success: true,
                download_url: downloadUrl,
            }
        }


        return null;
    }

    export function getBlobUrlForKey(key: string) {
        return `${baseUrl}/api/needle/blob/${key}`;
    }

    export async function download(url: string, progressCallback?: (prog: ProgressEvent) => void): Promise<Uint8Array | null> {

        // Using a FileLoader here instead of manually fetching so we're able to use the three.js cache system
        const loader = new FileLoader();
        loader.setResponseType('arraybuffer');
        // loader.setRequestHeader( this.requestHeader );
        // loader.setWithCredentials( this.withCredentials );
        const res = await loader.loadAsync(url, prog => {
            if (progressCallback) {
                progressCallback.call(null, prog);
            }
        });
        if (!(res instanceof ArrayBuffer)) {
            console.error("Download failed, no arraybuffer returned");
            return null;
        }
        return new Uint8Array(res);


        // Old solution: this didn't re-use the three.js loading cache. Using a FileLoader the GLTFLoader under the hood is smart enough to NOT start a new download request

        // const response = await fetch(url);

        // const reader = response.body?.getReader();
        // const contentLength = response.headers.get('Content-Length');
        // const total = contentLength ? parseInt(contentLength) : 0;

        // if (!reader) return null;

        // let received: number = 0;
        // const chunks: Uint8Array[] = [];
        // while (true) {
        //     const { done, value } = await reader.read();
        //     if (value) {
        //         chunks.push(value);
        //         received += value.length;
        //         progressCallback?.call(null, new ProgressEvent('progress', { loaded: received, total: total }));
        //     }

        //     if (done) {
        //         break;
        //     }
        // }
        // const final = new Uint8Array(received);
        // let position = 0;
        // for (const chunk of chunks) {
        //     final.set(chunk, position);
        //     position += chunk.length;
        // }
        // return final;
    }
}


