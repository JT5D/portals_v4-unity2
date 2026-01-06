import { Box3, BufferAttribute } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
// Modified according to https://github.com/gkjohnson/three-mesh-bvh/issues/636#issuecomment-2209571751
import { WorkerBase } from "three-mesh-bvh/src/workers/utils/WorkerBase.js";
export class GenerateMeshBVHWorker extends WorkerBase {
    constructor() {
        // TODO: make mesh bvh worker "work" for prebundled CDN loading
        // https://linear.app/needle/issue/NE-6572
        // Also we don't use toplevel imports to not completely fail to load needle-engine where loading the worker fails
        // const meta_url = import.meta.url;
        // const getWorker = () => new Worker(url, { type: 'module' })
        // console.log(meta_url, url, getWorker());
        super(new Worker(new URL('three-mesh-bvh/src/workers/generateMeshBVH.worker.js', import.meta.url), { type: 'module' }));
        this.name = 'GenerateMeshBVHWorker';
    }
    runTask(worker, geometry, options = {}) {
        return new Promise((resolve, reject) => {
            if (geometry.getAttribute('position').isInterleavedBufferAttribute ||
                geometry.index && geometry.index.isInterleavedBufferAttribute) {
                throw new Error('GenerateMeshBVHWorker: InterleavedBufferAttribute are not supported for the geometry attributes.');
            }
            worker.onerror = e => {
                reject(new Error(`[GenerateMeshBVHWorker] ${e.message || "Unknown error. Please check the server console. If you're using vite try adding 'three-mesh-bvh' to 'optimizeDeps.exclude' in your vite.config.js"}`));
            };
            worker.onmessage = e => {
                const { data } = e;
                if (data.error) {
                    reject(new Error(data.error));
                    worker.onmessage = null;
                }
                else if (data.serialized) {
                    const { serialized, position } = data;
                    const bvh = MeshBVH.deserialize(serialized, geometry, { setIndex: false });
                    const boundsOptions = Object.assign({
                        setBoundingBox: true,
                    }, options);
                    // we need to replace the arrays because they're neutered entirely by the
                    // webworker transfer.
                    geometry.attributes.position.array = position;
                    if (serialized.index) {
                        if (geometry.index) {
                            geometry.index.array = serialized.index;
                        }
                        else {
                            const newIndex = new BufferAttribute(serialized.index, 1, false);
                            geometry.setIndex(newIndex);
                        }
                    }
                    if (boundsOptions.setBoundingBox) {
                        geometry.boundingBox = bvh.getBoundingBox(new Box3());
                    }
                    if (options.onProgress) {
                        options.onProgress(data.progress);
                    }
                    resolve(bvh);
                    worker.onmessage = null;
                }
                else if (options.onProgress) {
                    options.onProgress(data.progress);
                }
            };
            const index = geometry.index ? geometry.index.array : null;
            const position = geometry.attributes.position.array;
            const transferable = [position];
            if (index) {
                transferable.push(index);
            }
            worker.postMessage({
                index,
                position,
                options: {
                    ...options,
                    onProgress: null,
                    includedProgressCallback: Boolean(options.onProgress),
                    groups: [...geometry.groups],
                },
            }, transferable.map(arr => arr.buffer).filter(v => (typeof SharedArrayBuffer === 'undefined') || !(v instanceof SharedArrayBuffer)));
        });
    }
}
//# sourceMappingURL=GenerateMeshBVHWorker.js.map