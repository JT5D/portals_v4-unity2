import { isDevEnvironment } from "./debug/index.js";
import { registeredMimetypeCallbacks } from "./engine_loaders.callbacks.js";
import { getParam } from "./engine_utils.js";

const debug = getParam("debugfileformat");
/**
 * The supported file types that can be determined by the engine. Used in {@link tryDetermineMimetypeFromURL} and {@link tryDetermineMimetypeFromBinary}
 */
export type NeedleMimetype = "unknown" | "unsupported" |
    "model/gltf+json" |
    "model/gltf-binary" |
    "model/vrm" |
    "model/vnd.usdz+zip" |
    "model/vnd.usd" |
    "model/vnd.usda" |
    "model/vnd.usdc" |
    "model/fbx" |
    "model/vnd.autodesk.fbx" |
    "model/obj"
    | (string & {})



export function determineMimeTypeFromExtension(name: string): NeedleMimetype | null {
    const ext = name.split(".").pop() || name;
    switch (ext.toUpperCase()) {
        case "GLTF":
            return "model/gltf+json";
        case "VRM":
            return "model/vrm";
        case "GLB":
            return "model/gltf-binary";
        case "FBX":
            return "model/fbx";
        case "USD":
            return "model/vnd.usd+zip";
        case "USDA":
            return "model/vnd.usda+zip";
        case "USDZ":
            return "model/vnd.usdz+zip";
        case "OBJ":
            return "model/obj";
        default:
            return null;
    }
}

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
export async function tryDetermineMimetypeFromURL(url: string, opts: { useExtension: boolean }): Promise<NeedleMimetype> {

    const { useExtension = true } = opts;

    if (useExtension) {
        // We want to save on requests so we first check the file extension if there's any
        // In some scenarios we might not have one (e.g. if we're dealing with blob: files or if the URL doesn't contain the filename)
        // In that case we need to check the header
        const _url = url;
        // if (!_url.startsWith("http") && !url.startsWith("blob:")) {
        //     // _url = "file:" + url;
        // }

        const urlobj = new URL(_url, globalThis.location.href);
        let ext: string | null | undefined = null;
        const query = urlobj.searchParams.get("filetype");
        if (query) ext = query.toUpperCase();
        if (!ext?.length) {
            ext = urlobj.pathname.split(".").pop()?.toUpperCase();
        }
        if (debug) console.warn(`[Needle Engine] Try to use file extension to determine type: '${ext}'`);
        switch (ext) {
            case "GLTF":
                return "model/gltf+json"
            case "VRM":
                return "model/vrm";
            case "GLB":
                return "model/gltf-binary";
            case "FBX":
                return "model/fbx";
            case "USD":
                return "model/vnd.usd+zip";
            case "USDA":
                return "model/vnd.usda+zip";
            case "USDZ":
                return "model/vnd.usdz+zip";
            case "OBJ":
                return "model/obj";
        }
    }


    // If the URL doesnt contain a filetype we need to check the header
    // This is the case for example if we load a file from a data url
    const originalUrl = url;

    if (url.startsWith("blob:")) {
        // We can't modify the blob URL
    }
    else {
        const newUrl = new URL(url, globalThis.location.href);
        // Adding a URL parameter to avoid the brower to bust the full cache
        // If we don't do this the file that might already be disc cached will be deleted from the cache
        newUrl.searchParams.append("range", "true");
        url = newUrl.toString();
    }
    const header = await fetch(url, {
        method: "GET",
        headers: {
            "range": "bytes=0-32"
        }
    }).catch(_ => {
        return null;
    });

    if (header?.ok) {
        const data = await header.arrayBuffer();
        const res = tryDetermineMimetypeFromBinary(originalUrl, data, header);
        if (debug) console.log("[Needle Engine] Determined file type from header: " + res);
        return res;
    }

    return "unknown";
}


/** Attempts to determine the file type of a binary file by looking at the first few bytes of the file. 
 * @hidden 
 */
export function tryDetermineMimetypeFromBinary(url: string, data: ArrayBuffer, response: Response): NeedleMimetype {

    if (data.byteLength < 4) {
        return "unknown";
    }

    const bytes = new Uint8Array(data);

    if (debug) {
        console.warn("[Needle Engine] Trying to determine file type from binary data\n", "\"" + new TextDecoder().decode(data) + "\"\n", bytes);
    }

    // Text with all whitespace stripped
    const bytesAsText = new TextDecoder().decode(data).replace(/\s/g, "");

    // GLTF
    if (bytesAsText[0] === "{" && bytesAsText[1] === "\"") {
        console.debug("GLTF detected");
        return "model/gltf+json";
    }
    else if (bytes[0] == 103 && bytes[1] == 108 && bytes[2] == 84 && bytes[3] == 70 && (bytes[4] == 10 || bytes[4] === 2)) {
        // GLTF Binary
        console.debug("GLTF .bin detected");
        return "model/gltf+json"; // actually application/octet-stream
    }
    // GLB
    else if (bytes[0] == 103 && bytes[1] == 108 && bytes[2] == 84 && bytes[3] == 70 && bytes[4] == 98) {
        // GLB
        console.debug("GLB detected");
        return "model/gltf-binary";
    }
    // USDZ
    if (bytes[0] == 80 && bytes[1] == 75 && bytes[2] == 3 && bytes[3] == 4) {
        console.debug("USDZ detected");
        return "model/vnd.usdz+zip";
    }
    // USD
    if (bytes[0] == 80 && bytes[1] == 88 && bytes[2] == 82 && bytes[3] == 45 && bytes[4] == 85 && bytes[5] == 83 && bytes[6] == 68 && bytes[7] == 67) {
        console.debug("Binary USD detected");
        return "model/vnd.usd";
    }
    // USDA: check if the file starts with #usda
    else if (bytes[0] == 35 && bytes[1] == 117 && bytes[2] == 115 && bytes[3] == 100 && bytes[4] == 97) {
        console.debug("ASCII USD detected");
        return "model/vnd.usda";
    }
    // FBX
    if (bytes[0] == 75 && bytes[1] == 97 && bytes[2] == 121 && bytes[3] == 100 && bytes[4] == 97 && bytes[5] == 114 && bytes[6] == 97 && bytes[7] == 32) {
        console.debug("Binary FBX detected");
        return "model/fbx";
    }
    // ASCII FBX
    else if (bytes[0] == 59 && bytes[1] == 32 && bytes[2] == 70 && bytes[3] == 66 && bytes[4] == 88 && bytes[5] == 32) {
        console.debug("ASCII FBX detected");
        return "model/fbx";
    }
    // OBJ - in this case exported from blender it starts with "# Blender" - we only check the first 10 bytes, technically it could still be a different file so we should do this check at the end
    else if (bytes[0] == 35 && bytes[1] == 32 && bytes[2] == 66 && bytes[3] == 108 && bytes[4] == 101 && bytes[5] == 110 && bytes[6] == 100 && bytes[7] == 101 && bytes[8] == 114 && bytes[9] == 32) {
        console.debug("OBJ detected");
        return "model/obj";
    }
    // Check if it starts "# Alias OBJ"
    else if (bytes[0] == 35 && bytes[1] == 32 && bytes[2] == 65 && bytes[3] == 108 && bytes[4] == 105 && bytes[5] == 97 && bytes[6] == 115 && bytes[7] == 32 && bytes[8] == 79 && bytes[9] == 66 && bytes[10] == 74) {
        console.debug("OBJ detected");
        return "model/obj";
    }
    else if (response.headers.has("content-type")) {
        const content_type = response.headers.get("content-type");
        if (content_type?.startsWith("image/")) {
            console.debug("Image detected, not a model file");
            return "unsupported";
        }
        console.debug("Content-Type: " + content_type);
        switch (content_type) {
            case "model/gltf+json":
            case "model/gltf-binary":
            case "model/vrm":
            case "model/vnd.usdz+zip":
            case "model/vnd.usd+zip":
            case "model/vnd.usd":
            case "model/vnd.usda+zip":
            case "model/vnd.usda":
            case "model/vnd.usdc":
            case "model/fbx":
            case "model/vnd.autodesk.fbx":
            case "model/obj":
                return content_type;
            // case "model/stl":
            //     return "stl";
            case "text/plain":
                // Should we assume obj here?
                break;
        }
    }

    // Check if it starts with "v " (vertex) or "f " (face) indicating that it's an OBJ file
    // If the OBJ file does lack a header altogether and no other check matched
    if ((bytes[0] == 118 && bytes[1] == 32) || (bytes[0] == 102 && bytes[1] == 32)) {
        console.debug("OBJ detected (the file has no header and starts with vertex or face)");
        return "obj";
    }
    // Check if the file starts with "# File exported by ZBrush"
    else if (bytes[0] == 35 && bytes[1] == 32 && bytes[2] == 70 && bytes[3] == 105 && bytes[4] == 108 && bytes[5] == 101 && bytes[6] == 32 && bytes[7] == 101 && bytes[8] == 120 && bytes[9] == 112 && bytes[10] == 111 && bytes[11] == 114 && bytes[12] == 116 && bytes[13] == 101 && bytes[14] == 100 && bytes[15] == 32 && bytes[16] == 98 && bytes[17] == 121 && bytes[18] == 32 && bytes[19] == 90 && bytes[20] == 66 && bytes[21] == 114 && bytes[22] == 117 && bytes[23] == 115 && bytes[24] == 104) {
        console.debug("OBJ detected (exported by ZBrush)");
        return "obj";
    }
    // Check if the file starts with mtllib (indicating that it's an OBJ file)
    else if (bytes[0] == 109 && bytes[1] == 116 && bytes[2] == 108 && bytes[3] == 108 && bytes[4] == 105 && bytes[5] == 98) {
        console.debug("OBJ detected (mtllib)");
        return "obj";
    }
    // const text = new TextDecoder().decode(data);
    // if (text.startsWith("Kaydara FBX")) {
    //     return "fbx";
    // }
    // else if (text.startsWith("glTF")) {
    //     return "gltf";
    // }

    for (const callback of registeredMimetypeCallbacks) {
        const mimetype = callback({
            url: url,
            response: response,
            contentType: response.headers.get("content-type"),
            bytes: bytes
        })
        if (mimetype) {
            if (debug) console.debug(`Mimetype callback returned: ${mimetype}`);
            return mimetype;
        }
    }


    if (isDevEnvironment() || debug) {
        const text = new TextDecoder().decode(data.slice(0, Math.min(data.byteLength, 32)));
        console.warn(`Could not determine file type.\n\nConsider registering a custom loader via the 'onCreateCustomModelLoader' callback: 'NeedleEngineModelLoader.onCreateCustomModelLoader(args => { })'\n\nContent-Type: \"${response.headers.get("content-type")}\n\"Text: \"${text}\"\nBinary:`, bytes);
    }
    else {
        console.debug(`Could not determine file type from binary data`);
    }

    return "unknown";
}