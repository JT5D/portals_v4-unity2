
import { addDracoAndKTX2Loaders as addDracoAndKTX2LoadersGLTFProgressive, configureLoader, createLoaders, setDracoDecoderLocation, setKTX2TranscoderLocation } from '@needle-tools/gltf-progressive';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

import { Context } from "./engine_setup.js"
import { getParam } from "./engine_utils.js";

const debug = getParam("debugdecoders");

let loaders: null | { dracoLoader: DRACOLoader, ktx2Loader: KTX2Loader, meshoptDecoder: typeof MeshoptDecoder } = null;

function ensureLoaders() {
    if (!loaders) {
        const res = createLoaders(null);
        loaders = { dracoLoader: res.dracoLoader, ktx2Loader: res.ktx2Loader, meshoptDecoder: res.meshoptDecoder };
    }
    return loaders;
}

export function setDracoDecoderPath(path: string | undefined) {
    if (path !== undefined && typeof path === "string") {
        setDracoDecoderLocation(path);
    }
}

export function setDracoDecoderType(type: string | undefined) {
    if (type !== undefined && typeof type === "string") {
        if (type !== "js") {
            const loaders = ensureLoaders();
            if (debug) console.log("Setting draco decoder type to", type);
            loaders.dracoLoader.setDecoderConfig({ type: type });
        }
    }
}

export function setKtx2TranscoderPath(path: string) {
    if (path !== undefined && typeof path === "string") {
        setKTX2TranscoderLocation(path);
    }
}

export function setMeshoptDecoder(_meshoptDecoder: any) {
    if (_meshoptDecoder !== undefined) {
        const loaders = ensureLoaders();
        loaders.meshoptDecoder = _meshoptDecoder;
    }
}

/**
 * Add Draco, Meshopt and KTX2 loaders to a GLTFLoader instance.
 * @param loader The GLTFLoader instance to add the loaders to.
 * @param context The context object containing the renderer.
 * @returns The GLTFLoader instance with the loaders added.
 */
export function addDracoAndKTX2Loaders(loader: GLTFLoader, context: Pick<Context, "renderer">) {

    const loaders = ensureLoaders();

    if (context.renderer) {
        loaders.ktx2Loader.detectSupport(context.renderer);
    }
    else
        console.warn("No renderer provided to detect ktx2 support - loading KTX2 textures will probably fail");

    addDracoAndKTX2LoadersGLTFProgressive(loader);

    if (!loader.dracoLoader)
        loader.setDRACOLoader(loaders.dracoLoader);
    if (!(loader as any).ktx2Loader)
        loader.setKTX2Loader(loaders.ktx2Loader);
    if (!(loader as any).meshoptDecoder)
        loader.setMeshoptDecoder(loaders.meshoptDecoder);

    configureLoader(loader, {
        progressive: true,
    });

    return loader;
}
