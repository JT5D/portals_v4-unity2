import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

const projectDir = process.cwd() + "/";

/**
 * @typedef {"auto-resolve" | ((res: string, packageName: string, index: number, path: string) => string | null | void)} PackageResolveValue
 */

/** these are alias callbacks as in the vite.alias dictionary
 * the first argument is the already resoled absolute path (it is only invoked if the path was found in node_modules)
 * the 2,3,4 args are the same as in vite.alias (packageName, index, path);
 */
/**
 * @type {Record<string, PackageResolveValue>}
 */
const packages_to_resolve = {
    // We are currently overriding "three" resolution to ensure that all dependencies resolve to the same three.js version.
    // This is hacky, but the alternative is potentially having conflicting three.js versions since some packages are 
    // stubborn with their peer dependencies or just slow (slower as we) with updating.
    // NOT adding this allows node.js to correctly resolve `exports` specified in three.js package.json;
    // since we're overriding resolution here we need to manually resolve the subset of exports that we use.
    'three/addons': (res, packageName, index, path) => {
        return "three/examples/jsm";
    },
    'three/nodes': (res, packageName, index, path) => {
        return "three/examples/jsm/nodes/Nodes.js";
    },
    'three': "auto-resolve",

    // Handle all previous imports where users did import using @needle-engine/src
    '@needle-tools/engine/src': (res, packageName, index, path) => {
        // resolve old engine/src imports UNLESS it's the asap plugin (the asap plugin currently only exists in the src folder)
        if (!path.startsWith("@needle-tools/engine/src/asap")) {
            return res + "/../lib";
        }
    },
    /* 
    Removed the previously present @needle-tools/engine entry 
    because this is automatically done by vite according to whatever we define in our package.json exports
    This did previously prevent us from declaring proper exports in package.json
    */
    '@needle-tools/engine': (res, packageName, index, _path) => {
        // Check if the import is something like @needle-tools/engine/engine/engine_utils
        // in which case we want to resolve into the lib directory
        if (_path.startsWith("@needle-tools/engine/engine")) {
            return res + "/lib";
        }
        const node_modules_path = path.resolve(projectDir, 'node_modules', '@needle-tools/engine');
        if (existsSync(node_modules_path)) {
            return node_modules_path;
        }
    },

    // Auto resolve to 'node_modules/<name>' or '@needle-tools/engine/node_modules/<name>'
    'peerjs': "auto-resolve",
    'websocket-ts': "auto-resolve",
    'md5': "auto-resolve",
    'three-mesh-bvh': "auto-resolve",
    'postprocessing': "auto-resolve",
    '@dimforge/rapier3d-compat': "auto-resolve",

    // Note: this isnt necessary anymore since we exclude needle-engine from optimization when locally installed in the dev server
    // '@needle-tools/gltf-progressive': "auto-resolve",
    // '@needle-tools/materialx': "auto-resolve",
}

/**
 * @param {import('../types').userSettings} userSettings
 */
export const needleViteAlias = (command, config, userSettings) => {

    if (config?.noAlias === true || userSettings?.noAlias === true)
        return;

    const debug = userSettings.debugAlias;

    let outputDebugFile = null;
    function log(...msg) {
        console.log(...msg);
        if (debug) logToFile(...msg);
    }
    function logToFile(...msg) {
        outputDebugFile?.write(msg.join(" ") + "\n");
    }
    if (debug) {
        const outputFilePath = path.resolve(projectDir, 'node_modules/.needle/needle.alias.log');
        const outputDirectory = path.dirname(outputFilePath);
        if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true });
        outputDebugFile = createWriteStream(outputFilePath, { flags: "a" });
        const timestamp = new Date().toISOString();
        outputDebugFile.write("\n\n\n--------------------------\n");
        outputDebugFile.write(`[needle-alias] Logging to: ${outputFilePath} (${timestamp})\n`);
        log("[needle-alias] Logging to: ", outputFilePath);
    }


    /** @type {import("vite").Plugin} */
    const aliasPlugin = {
        name: "needle-alias",
        config(config) {
            if (debug) console.log('[needle-alias] ProjectDirectory: ' + projectDir);
            if (!config.resolve) config.resolve = {};
            if (!config.resolve.alias) config.resolve.alias = {};
            const aliasDict = config.resolve.alias;

            for (const name in packages_to_resolve) {
                if (!aliasDict[name]) {
                    addPathResolver(name, aliasDict, packages_to_resolve[name], debug ?? false);
                }
            }


            // is needle engine a local package?
            // This will cause local changes to not be reflected anymore...
            const localEnginePath = path.resolve(projectDir, 'node_modules/', '@needle-tools/engine', 'node_modules', '.package-lock.json');
            if (existsSync(localEnginePath)) {
                config.optimizeDeps ??= {};
                config.optimizeDeps.exclude ??= [];
                if (!config.optimizeDeps.include?.includes('@needle-tools/engine')) {
                    config.optimizeDeps.exclude.push('@needle-tools/engine');
                    log("[needle-alias] Detected local @needle-tools/engine package → will exclude it from optimization");
                }
            }


            if (debug) {
                const testResults = [];
                for (const name in aliasDict) {
                    const entry = aliasDict[name];
                    let res = entry;
                    if (typeof entry === "function") res = entry(name, 0, name);
                    testResults.push({ name, entry: res });
                }
                console.log('[needle-alias] Aliases: ', testResults);
            }
        },
    }

    /** @type {string|undefined} */
    let lastImporter = "";
    /** This plugin logs all imports. This helps to find cases where incorrect folders are found/resolved. */

    /** @type {import("vite").Plugin} */
    const debuggingPlugin = {
        name: "needle:alias-debug",
        // needs to run before regular resolver
        enforce: 'pre',
        resolveId(id, importer, options) {
            if (importer) {
                // simplify paths for better readability
                if (importer.includes("js/package~")) importer = "package~" + importer.split("js/package~")[1];
                if (importer.includes("node_modules/@needle-tools")) importer = "node_modules/@needle-tools" + importer.split("node_modules/@needle-tools")[1];
                if (importer.includes("node_modules/.vite")) importer = ".vite" + importer.split("node_modules/.vite")[1];
            }

            // could filter here, e.g. for things related to three
            // if (id.includes("three")) return;

            // verbose logging for all imports
            if (lastImporter !== importer) {
                lastImporter = importer;
                logToFile(`[needle-alias] Resolving: ${importer} (file${options?.ssr ? ", SSR" : ""})`);
            }
            logToFile(`[needle-alias]     → ${id}`);
            return;
        },
    }
    if (debug) return [debuggingPlugin, aliasPlugin];
    return [aliasPlugin];


    /**
     * Adds a path resolver to the alias dictionary.
     * @param {string} name - The name of the package to resolve.
     * @param {import("vite").AliasOptions} aliasDict - The alias dictionary to add the resolver to.
     * @param {PackageResolveValue | null} value - A callback function to override the default resolution behavior.
     * @param {boolean} debug - Whether to log debug information.
     * @returns {void}
     */
    function addPathResolver(name, aliasDict, value, debug) {
        // If a package at the node_modules path exist we resolve the request there
        // introduced in 89a50718c38940abb99ee16c5e029065e41d7d65
        const callback = typeof value === "function" ? value : null;

        let fullpath = path.resolve(projectDir, 'node_modules', name);
        // if (!existsSync(path.resolve(fullpath, "package.json"))) 
        {
            const pathInEngine = path.resolve(projectDir, 'node_modules', "@needle-tools/engine", "node_modules", name);
            if (existsSync(pathInEngine)) {
                fullpath = pathInEngine;
            }
        }

        const workingDirectory = `${process.cwd()}/`;
        const pathExists = existsSync(fullpath);

        aliasDict[name] = (packageName, index, path) => {
            if (callback !== null) {
                const overrideResult = callback(fullpath, packageName, index, path);
                if (typeof overrideResult === "string")
                    if (existsSync(overrideResult)) {
                        if (debug && overrideResult !== packageName) log(`[needle-alias] Resolved \"${path}\"   →   \"${overrideResult.substring(workingDirectory.length).replaceAll("\\", "/")}\"`);
                        return overrideResult;
                    }
            }

            if (pathExists) {
                if (debug && path !== packageName) log(`[needle-alias] Resolved \"${path}\"   →   \"${fullpath.substring(workingDirectory.length).replaceAll("\\", "/")}\"`);
                return fullpath;
            }
        }
    }
};
