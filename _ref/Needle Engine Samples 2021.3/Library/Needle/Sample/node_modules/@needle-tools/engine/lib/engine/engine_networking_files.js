import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from "three";
export var File_Event;
(function (File_Event) {
    File_Event["File_Spawned"] = "file-spawned";
})(File_Event || (File_Event = {}));
export class FileSpawnModel {
    guid;
    file_name;
    file_hash;
    file_size;
    position;
    scale;
    seed;
    sender;
    /** the url to download the file */
    downloadUrl;
    parentGuid;
    boundsSize;
    constructor(connectionId, seed, guid, name, hash, size, position, scale, downloadUrl) {
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
export var PreviewHelper;
(function (PreviewHelper) {
    const previews = new Map();
    function addPreview(params) {
        if (previews.has(params.guid)) {
            removePreview(params.guid);
        }
        const root = new Object3D();
        previews.set(params.guid, root);
        const rendering = new Object3D();
        rendering.position.y = -0.5;
        root.add(rendering);
        const outline = new Mesh(new BoxGeometry(1, 1, 1, 1, 1, 1), new MeshBasicMaterial({ color: 0xdddddd, wireframe: true, transparent: true, opacity: .3 }));
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
        if (params.position)
            root.position?.copy(params.position);
        if (params.size) {
            root.worldScale = new Vector3().copy(params.size);
        }
        root.position.y = root.scale.y / 2;
        return {
            object: root,
            onProgress: (downloadProgress) => {
                if (progress instanceof Object3D) {
                    progress.scale.set(1, downloadProgress, 1);
                }
            },
        };
    }
    PreviewHelper.addPreview = addPreview;
    function removePreview(guid) {
        const existing = previews.get(guid);
        if (existing) {
            previews.delete(guid);
            existing.removeFromParent();
        }
    }
    PreviewHelper.removePreview = removePreview;
})(PreviewHelper || (PreviewHelper = {}));
//# sourceMappingURL=engine_networking_files.js.map