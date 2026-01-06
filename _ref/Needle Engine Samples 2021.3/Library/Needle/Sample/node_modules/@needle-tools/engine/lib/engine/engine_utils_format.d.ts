/**
 * The supported file types that can be determined by the engine. Used in {@link tryDetermineMimetypeFromURL} and {@link tryDetermineMimetypeFromBinary}
 */
export type NeedleMimetype = "unknown" | "unsupported" | "model/gltf+json" | "model/gltf-binary" | "model/vrm" | "model/vnd.usdz+zip" | "model/vnd.usd" | "model/vnd.usda" | "model/vnd.usdc" | "model/fbx" | "model/vnd.autodesk.fbx" | "model/obj" | (string & {});
export declare function determineMimeTypeFromExtension(name: string): NeedleMimetype | null;
/**
 * Tries to determine the file type of a file from its URL
 * This method does perform a range request to the server to get the first few bytes of the file
 * If the file type can not be determined it will return "unknown"
 * @param url The URL of the file
 * @param useExtension If true the file type will be determined by the file extension first - if the file extension is not known it will then check the header
 * @example
 * ```typescript
 * const url = "https://example.com/model.glb";
 * const fileType = await tryDetermineFileTypeFromURL(url);
 * console.log(fileType); // "glb"
 */
export declare function tryDetermineMimetypeFromURL(url: string, opts: {
    useExtension: boolean;
}): Promise<NeedleMimetype>;
/** Attempts to determine the file type of a binary file by looking at the first few bytes of the file.
 * @hidden
 */
export declare function tryDetermineMimetypeFromBinary(url: string, data: ArrayBuffer, response: Response): NeedleMimetype;
