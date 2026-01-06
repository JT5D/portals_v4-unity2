import { tryGetNeedleEngineVersion, tryGetPackageVersion } from '../common/version.js';

/**
 * @type {string[]}
 */
export const preloadScriptPaths = [];


/**
 * @param {import('../types').userSettings} userSettings
 * @returns {import('vite').Plugin[]}
 */
export const needleDependencies = (command, config, userSettings) => {

    /**
     * @type {import('vite').Plugin}
     */
    return [
        {
            name: 'needle:dependencies',
            enforce: 'pre',
            /**
             * @param {import('vite').UserConfig} config
             */
            config: (config, env) => {
                handleOptimizeDeps(config);
                handleManualChunks(config);
            },
        },
    ]
}

const excludeDependencies = [
    "three-mesh-bvh",
    "@needle-tools/gltf-progressive"
]

/**
 * @param {import('vite').UserConfig} config
 */
function handleOptimizeDeps(config) {
    excludeDependencies.forEach(dep => {
        if (config.optimizeDeps?.include?.includes(dep)) {
            console.log(`[needle-dependencies] ${dep} is included in the optimizeDeps.include array. This may cause issues with the worker import.`);
        }
        else {
            if (!config.optimizeDeps) {
                config.optimizeDeps = {};
            }
            if (!config.optimizeDeps.exclude) {
                config.optimizeDeps.exclude = [];
            }

            // This needs to be excluded from optimization because otherwise the worker import fails
            // three-mesh-bvh/src/workers/generateMeshBVH.worker.js?worker
            // same for gltf-progressive
            console.log(`[needle-dependencies] Adding ${dep} to the optimizeDeps.exclude array to support workers.`);
            config.optimizeDeps.exclude.push(dep);

            if (!config.server) config.server = {};
            if (!config.server.fs) config.server.fs = {};
            if (config.server.fs.strict === undefined) {
                // we need to disable strictness to allow importing the worker from three-mesh-bvh node_modules in our GenerateMeshBVHWorker.js file
                config.server.fs.strict = false;
            }
        }
    });
}

/**
 * @param {import('vite').UserConfig} config
 */
function handleManualChunks(config) {
    if (!config.build) {
        config.build = {};
    }
    if (!config.build.rollupOptions) {
        config.build.rollupOptions = {};
    }
    if (!config.build.rollupOptions.output) {
        config.build.rollupOptions.output = {};
    }

    const rollupOutput = config.build.rollupOptions.output;

    if (Array.isArray(rollupOutput)) {
        // append the manualChunks function to the array
        console.log("[needle-dependencies] registering manualChunks");
        rollupOutput.push({
            manualChunks: needleManualChunks
        })
    }
    else {
        // If preserveModules is true we can not modify the chunkFileNames
        let allowManualChunks = true;
        if ("manualChunks" in rollupOutput) {
            allowManualChunks = false;
            // if the user has already defined manualChunks (even when set to undefined), we don't want to overwrite it
            console.log("[needle-dependencies] manualChunks already found in vite config - will not overwrite it");
        }
        else if (rollupOutput.preserveModules === true) {
            allowManualChunks = false;
            console.log("[needle-dependencies] manualChunks can not be registered because preserveModules is true");
        }
        if (rollupOutput.inlineDynamicImports === true) {
            allowManualChunks = false;
            console.log("[needle-dependencies] manualChunks can not be registered because inlineDynamicImports is true");
        }

        if (allowManualChunks) {
            console.log("[needle-dependencies] registering manualChunks");
            rollupOutput.manualChunks = needleManualChunks;
        }

        if (rollupOutput.chunkFileNames) {
            console.log("[needle-dependencies] chunkFileNames already defined");
        }
        else {
            rollupOutput.chunkFileNames = handleChunkFileNames;
        }

        if (rollupOutput.assetFileNames) {
            console.log("[needle-dependencies] assetFileNames already defined");
        }
        else {
            rollupOutput.assetFileNames = assetFileNames;
        }
    }

    // TODO: this was a test if it allows us to remove the sync import of postprocessing due to n8ao's import
    // config.build.rollupOptions.external = (source, importer, isResolved) => {
    //     if (importer?.includes("node_modules/n8ao/") || importer?.includes("node_modules/postprocessing/")) {
    //         console.log("EXTERNAL", importer);
    //         return true;
    //     }
    // }

    /** https://rollupjs.org/configuration-options/#output-assetfilenames
     * @param {import("vite").Rollup.PreRenderedAsset} chunkInfo */
    function assetFileNames(chunkInfo) {
        // "assets/..." is the default

        // this happens if e.g. a glTF or GLB file is link preloaded
        if (chunkInfo.name?.toLowerCase().includes(".glb") || chunkInfo.name?.toLowerCase().includes(".gltf")) {
            return `assets/[name][extname]`;
        }
        return `assets/[name].[hash][extname]`;
    }

    /** @param {import("vite").Rollup.PreRenderedChunk} chunk */
    function handleChunkFileNames(chunk) {
        if (chunk.name === 'needle-engine') {
            try {
                const version = tryGetNeedleEngineVersion();
                if (version) {
                    const name = `assets/needle-engine@${version}.js`;
                    preloadScriptPaths.push(`./${name}`);
                    return name;
                }
            }
            catch (e) {
                console.warn("[needle-dependencies] Error reading version", e);
            }
        }
        else if (chunk.name === 'three') {
            const version = tryGetPackageVersion("three");
            if (version) {
                const name = `assets/three@${version}.js`;
                preloadScriptPaths.push(`./${name}`);
                return name;
            }
        }
        // else if(chunk.name === 'index') {
        //     console.log(chunk);
        //     debugger
        //     // this is the main chunk
        //     // we don't want to add a hash here to be able to easily import the main script
        //     return `index.js`;
        // }
        return `assets/[name].[hash].js`;
    }

    /** 
     * @param {string} id 
     * @param {import('vite').Rollup.ManualChunkMeta | null} meta
    */
    function needleManualChunks(id, meta) {

        // console.log(id);

        if (id.includes("three/examples")) {
            return "three-examples";
        }
        if (id.includes('/three/')) {
            return "three";
        }

        if (id.includes("node_modules/n8ao/")) {
            detectSyncImports(id, meta);
            return "postprocessing.ao";
        }

        if (id.includes("node_modules/postprocessing/")) {
            // postprocessing bundle is preloaded https://github.com/vitejs/vite/pull/9938
            detectSyncImports(id, meta);
            return "postprocessing";
        }

        if (id.includes("node_modules/three-mesh-ui")) {
            return "three-mesh-ui";
        }

        if (id.includes("@dimforge/rapier3d")) {
            detectSyncImports(id, meta);
            return "rapier3d";
        }

        if (id.includes("node_modules/three.quarks")) {
            return "three-quarks";
        }
        // we want to bundle gltf-progressive separately because it also initiates Draco and KTX worker preloading
        if (id.includes("/gltf-progressive/")) {
            return "gltf-progressive";
        }
        if (id.includes("node_modules/needle-engine")
            // DEV
            // || id.includes("/package~/src/")
        ) {
            return "needle-engine";
        }
    }
}


/** 
 * @param {string} id 
 * @param {import('vite').Rollup.ManualChunkMeta | null} meta
*/
function detectSyncImports(id, meta) {
    if (meta) {
        if (meta.getModuleInfo) {
            const info = meta.getModuleInfo(id);
            if (info && info.importers.length > 0) {
                const isNeedleDev = id.includes("/package~/src/");
                if (isNeedleDev) {
                    console.warn(`WARN: SYNC IMPORTER DETECTED of ${id}`);
                    console.warn(info.importers)
                }
            }
        }
    }
}