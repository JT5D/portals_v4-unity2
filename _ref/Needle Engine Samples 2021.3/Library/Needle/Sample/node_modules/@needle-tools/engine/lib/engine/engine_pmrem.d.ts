import { Texture, WebGLRenderer } from "three";
/**
 * Loads a PMREM texture from the given URL. This also supports the ultra-fast preprocessed environment maps (PMREM) format.
 * @param url The URL of the PMREM texture to load.
 * @param renderer The WebGLRenderer to use for loading the texture.
 * @returns A promise that resolves to the loaded texture or null if loading failed.
 */
export declare function loadPMREM(url: string, renderer: WebGLRenderer): Promise<Texture | null>;
