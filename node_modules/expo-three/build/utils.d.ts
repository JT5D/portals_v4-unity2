import THREE from './Three';
export declare function alignMesh(mesh: THREE.Mesh, axis?: {
    x: number;
    y: number;
    z: number;
}): void;
export declare function scaleLongestSideToSize(mesh: THREE.Mesh, size: number): void;
/** Used for smoothing imported meshes */
export declare function computeMeshNormals(mesh: THREE.Mesh): void;
/**
 * Retrieves the file extension from a given URL.
 * @param url - The URL to extract the file extension from.
 * @returns The file extension, or an empty string if no extension is found.
 */
export declare const getUrlExtension: (url: string) => string;
/**
 * Checks if the given URL has a matching extension from the provided list of extensions.
 * @param url - The URL to check.
 * @param extensions - An array of extensions to match against.
 * @returns A boolean indicating whether the URL has a matching extension.
 */
export declare const matchUrlExtensions: (url: string, extensions: string[]) => boolean;
export declare const matchUrlExtension: (url: string, extension: string) => boolean;
//# sourceMappingURL=utils.d.ts.map