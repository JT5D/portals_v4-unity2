import { Object3D, Vector3, Vector3Like } from "three";
import type { IModel } from "./engine_networking_types.js";
import type { Vec3 } from "./engine_types.js";
export declare enum File_Event {
    File_Spawned = "file-spawned"
}
export declare class FileSpawnModel implements IModel {
    guid: string;
    file_name: string;
    file_hash: string;
    file_size: number;
    position: Vector3 | null;
    scale: Vector3 | null;
    seed: number;
    sender: string;
    /** the url to download the file */
    downloadUrl: string;
    parentGuid?: string;
    boundsSize?: Vector3;
    constructor(connectionId: string, seed: number, guid: string, name: string, hash: string, size: number, position: Vector3, scale: Vector3, downloadUrl: string);
}
export declare namespace PreviewHelper {
    type PreviewInfo = {
        position?: Vector3Like | Vec3;
        size?: Vector3Like | Vec3;
    };
    function addPreview(params: {
        parent: Object3D;
        guid: string;
    } & PreviewInfo): {
        object: Object3D;
        onProgress: (downloadProgress: number) => void;
    };
    function removePreview(guid: string): void;
}
