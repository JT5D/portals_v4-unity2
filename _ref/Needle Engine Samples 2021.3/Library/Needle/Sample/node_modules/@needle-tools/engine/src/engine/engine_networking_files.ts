import { BoxGeometry, BoxHelper, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3, Vector3Like } from "three";

import { getLoader } from "../engine/engine_gltf.js";
import { NetworkConnection } from "../engine/engine_networking.js";
import { generateSeed, InstantiateIdProvider } from "../engine/engine_networking_instantiate.js";
import { Context } from "../engine/engine_setup.js";
import { ContextEvent, ContextRegistry } from "./engine_context_registry.js";
import { findByGuid } from "./engine_gameobject.js";
import { BlobStorage } from "./engine_networking_blob.js";
import * as def from "./engine_networking_files_default_components.js"
import type { IModel } from "./engine_networking_types.js";
import type { IGameObject, Vec3 } from "./engine_types.js";

export enum File_Event {
    File_Spawned = "file-spawned",
}

export class FileSpawnModel implements IModel {
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

    constructor(connectionId: string, seed: number, guid: string, name: string, hash: string, size: number, position: Vector3, scale: Vector3, downloadUrl: string) {
        this.seed = seed;
        this.guid = guid;
        this.file_name = name;
        this.file_hash = hash;
        this.file_size = size;
        this.position = position;
        this.scale = scale;
        this.sender = connectionId;
        this.downloadUrl = downloadUrl;
    }
}



// ContextRegistry.registerCallback(ContextEvent.ContextCreated, evt => {
//     beginListenFileSpawn(evt.context as Context);
// })

// function beginListenFileSpawn(context: Context) {
//     context.connection.beginListen(File_Event.File_Spawned, async (evt: FileSpawnModel) => {
//         if (evt.sender !== context.connection.connectionId) {
//             console.log("received file event", evt);
//             const prev = addPreview(evt, context);
//             let bin: ArrayBuffer | null = null;
//             try {
//                 const arr = await BlobStorage.download(evt.downloadUrl, prog => {
//                     prev.onProgress(prog.loaded / prog.total);
//                 });
//                 if (arr)
//                     bin = arr.buffer;
//             }
//             finally {
//                 removePreview(evt, context);
//             }
//             if (bin) {
//                 const prov = new InstantiateIdProvider(evt.seed);
//                 const gltf = await getLoader().parseSync(context, bin, evt.file_name, prov);
//                 if (gltf && gltf.scene) {
//                     const obj = gltf.scene;
//                     def.onDynamicObjectAdded(obj, prov, gltf);
//                     // if we process new scripts immediately references that rely on guids are not properly resolved
//                     // for example duplicatable "object" reference will not be found anymore because guid has changed
//                     // processNewScripts(context);

//                     // add object to proper parent
//                     if (evt.parentGuid) {
//                         const parent = findByGuid(evt.parentGuid, context.scene) as Object3D;
//                         if (parent && "add" in parent) parent.add(obj);
//                     }
//                     if (!obj.parent)
//                         context.scene.add(obj);

//                     if (evt.position !== null) {
//                         obj.position.copy(evt.position);
//                     }
//                 }
//             }
//             else console.error("download didnt return file");
//         }
//     });
// }



// async function handleUpload(connection: NetworkConnection, file: File, seed: number, obj: IGameObject) {
//     if (!connection.connectionId) {
//         console.error("Can not upload file: not connected to networking backend");
//         return;
//     }
//     if (!obj.guid) {
//         console.error("Can not upload file: the object does not have a guid");
//         return;
//     }
//     // then try uploading it
//     const upload_result = await BlobStorage.upload(file);
//     if (!upload_result) {
//         return;
//     }
//     if (!upload_result.filename) {
//         console.error("Can not send upload event - no filename", file.name);
//         return;
//     }
//     if (!upload_result.hash) {
//         console.error("Can not send upload event - no hash", file.name);
//         return;
//     }
//     if (!upload_result.url) {
//         console.error("Can not send upload event - no url", file.name);
//         return;
//     }
//     const model = new FileSpawnModel(
//         connection.connectionId, 
//         seed,
//         obj.guid, 
//         upload_result.filename,
//         upload_result.hash,
//         file.size,
//         obj.position,
//         obj.scale,
//         upload_result.url,
//     );
//     if (obj.parent)
//         model.parentGuid = obj.parent["guid"];
//     connection.send(File_Event.File_Spawned, model);
// }


export namespace PreviewHelper {

    const previews = new Map<string, Object3D>();

    export declare type PreviewInfo = {
        position?: Vector3Like | Vec3,
        size?: Vector3Like | Vec3,
    }

    export function addPreview(params: { parent: Object3D, guid: string } & PreviewInfo): {
        object: Object3D,
        onProgress: (downloadProgress: number) => void
    } {

        if (previews.has(params.guid)) {
            removePreview(params.guid);
        }

        const root = new Object3D();
        previews.set(params.guid, root);

        const rendering = new Object3D();
        rendering.position.y = -0.5;
        root.add(rendering);

        const outline = new Mesh(new BoxGeometry(1, 1, 1, 1, 1, 1), new MeshBasicMaterial(
            { color: 0xdddddd, wireframe: true, transparent: true, opacity: .3 }
        ));
        outline.position.y = 0.5;
        rendering.add(outline);

        const progress = new Object3D();
        rendering.add(progress);

        const progressMesh = new Mesh(new BoxGeometry(1, 1, 1, 1, 1, 1), new MeshBasicMaterial({
            color: 0xbbcccc, transparent: true, opacity: .4
        }));
        progressMesh.position.y = 0.5;
        progress.scale.y = 0.01;        
        progress.add(progressMesh);

        const progressMeshTopPlane = new Mesh(new PlaneGeometry(1, 1, 1, 1), new MeshBasicMaterial({
            color: 0x000022, transparent: true, opacity: .05, depthTest: false,
        }));
        progressMeshTopPlane.rotateX(-Math.PI / 2);
        progressMeshTopPlane.position.y = .51;
        progressMesh.add(progressMeshTopPlane);


        params.parent.add(root);
        root.rotateY(Math.PI / 2);
        // root.quaternion.copy(params.parent.quaternion);

        if (params.position) root.position?.copy(params.position);
        if (params.size) {
            root.worldScale = new Vector3().copy(params.size);
        }
        root.position.y = root.scale.y / 2;

        return {
            object: root,
            onProgress: (downloadProgress: number) => {
                if (progress instanceof Object3D) {
                    progress.scale.set(1, downloadProgress, 1);
                }
            },
        }
    }

    export function removePreview(guid: string) {
        const existing = previews.get(guid);
        if (existing) {
            previews.delete(guid);
            existing.removeFromParent();
        }
    }
}
