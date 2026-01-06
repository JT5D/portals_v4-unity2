import { createLoaders } from "@needle-tools/gltf-progressive";
import { CubeUVReflectionMapping, SRGBColorSpace, TextureLoader } from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
const running = new Map();
// #region api
/**
 * Loads a PMREM texture from the given URL. This also supports the ultra-fast preprocessed environment maps (PMREM) format.
 * @param url The URL of the PMREM texture to load.
 * @param renderer The WebGLRenderer to use for loading the texture.
 * @returns A promise that resolves to the loaded texture or null if loading failed.
 */
export function loadPMREM(url, renderer) {
    if (running.has(url)) {
        return running.get(url);
    }
    const actualUrl = new URL(url, window.location.href);
    const promise = internalLoadPMREM(actualUrl, renderer);
    running.set(url, promise);
    promise.finally(() => {
        running.delete(url);
    });
    return promise;
}
// #region loading
async function internalLoadPMREM(url, renderer) {
    if (!url)
        return Promise.resolve(null);
    const pathname = url.pathname;
    const isPMREM_URL = url.toString().toLowerCase().includes("pmrem") || url.searchParams.get("pmrem") != null;
    const isEXR = pathname.endsWith(".exr");
    const isHdr = pathname.endsWith(".hdr");
    const isKtx2 = pathname.endsWith(".ktx2");
    let loader;
    if (isEXR) {
        loader = new EXRLoader();
    }
    else if (isHdr) {
        loader = new RGBELoader();
    }
    else if (isKtx2) {
        const { ktx2Loader } = createLoaders(renderer);
        loader = ktx2Loader;
    }
    else {
        loader = new TextureLoader();
    }
    const str = url.toString();
    const promise = loader.loadAsync(str)
        .then(tex => {
        if (tex) {
            const nameIndex = pathname.lastIndexOf("/");
            tex.name = pathname.substring(nameIndex >= 0 ? nameIndex + 1 : 0);
            if (isPMREM_URL) {
                tex.mapping = CubeUVReflectionMapping;
            }
            if (loader instanceof TextureLoader) {
                tex.colorSpace = SRGBColorSpace;
            }
        }
        return tex;
    });
    const texture = await promise.catch(_err => {
        console.warn("Failed to load texture from url:", url);
        return null;
    });
    return texture;
}
//# sourceMappingURL=engine_pmrem.js.map