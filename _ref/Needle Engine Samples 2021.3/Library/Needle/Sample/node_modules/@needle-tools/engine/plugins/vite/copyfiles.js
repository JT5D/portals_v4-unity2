
import { resolve, join, isAbsolute } from 'path'
import { existsSync, statSync, mkdirSync, readdirSync, copyFileSync, mkdir, rmSync } from 'fs';
import { builtAssetsDirectory, tryLoadProjectConfig } from './config.js';
import { copyFilesSync } from '../common/files.js';

const pluginName = "needle-copy-files";


/** copy files on build from assets to dist 
 * @param {import('../types').userSettings} userSettings
 * @returns {import('vite').Plugin | null}
 */
export const needleCopyFiles = (command, config, userSettings) => {

    if (config?.noCopy === true || userSettings?.noCopy === true) {
        return null;
    }

    return {
        name: 'needle-copy-files',
        // explicitly don't enforce post or pre because we want to run before the build-pipeline plugin
        enforce: "pre",
        buildStart() {
            return run("start", config);
        },
        closeBundle() {
            return run("end", config);
        },
    }
}

/**
 * @param {"start" | "end"} buildstep
 * @param {import('../types').userSettings} config
 */
async function run(buildstep, config) {
    console.log(`[${pluginName}] - Copy files at ${buildstep}`);
    const copyIncludesFromEngine = config?.copyIncludesFromEngine ?? true;

    const baseDir = process.cwd();
    const override = buildstep === "start";

    let assetsDirName = "assets";
    let outdirName = "dist";

    const needleConfig = tryLoadProjectConfig();
    if (needleConfig) {
        assetsDirName = needleConfig.assetsDirectory || assetsDirName;
        while (assetsDirName.startsWith('/')) assetsDirName = assetsDirName.substring(1);

        if (needleConfig.buildDirectory)
            outdirName = needleConfig.buildDirectory;
    }

    if (copyIncludesFromEngine !== false) {
        // copy include from engine
        const engineIncludeDir = resolve(baseDir, 'node_modules', '@needle-tools', 'engine', 'src', 'include');
        if (existsSync(engineIncludeDir)) {
            console.log(`[${pluginName}] - Copy engine include to ${baseDir}/include`)
            const projectIncludeDir = resolve(baseDir, 'include');
            copyFilesSync(engineIncludeDir, projectIncludeDir);
        }
    }

    const outDir = resolve(baseDir, outdirName);
    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }

    // copy a list of files or directories declared in build.copy = [] in the needle.config.json
    /*
    "build": {
        "copy": ["myFolder", "myFile.txt"]
    }
    */
    if (needleConfig?.build?.copy) {
        const arr = needleConfig.build.copy;
        for (let i = 0; i < arr.length; i++) {
            const entry = arr[i];
            if (Array.isArray(entry)) {
                console.log("WARN: build.copy can only contain string paths to copy to. Found array instead.");
                continue;
            }
            const src = resolve(baseDir, entry);
            const dest = resolvePath(outDir, entry);
            if (existsSync(src) && dest) {
                console.log(`[${pluginName}] - Copy ${entry} to ${outdirName}/${entry}`)
                copyFilesSync(src, dest, override);
            }
        }
    }

    // copy assets dir
    const assetsDir = resolve(baseDir, assetsDirName);
    if (existsSync(assetsDir)) {
        const targetDir = resolve(outDir, 'assets');
        // ensure that the target directory exists and is cleared if it already exists
        // otherwise we might run into issues where the build pipeline is running for already compressed files
        if (override && existsSync(targetDir)) {
            console.log(`[${pluginName}] - Clearing target directory \"${targetDir}\"`);
            rmSync(targetDir, { recursive: true, force: true });
        }
        console.log(`[${pluginName}] - Copy assets to ${outdirName}/${builtAssetsDirectory()}`)
        copyFilesSync(assetsDir, targetDir, override);
    }
    else console.log(`WARN: No assets directory found. Skipping copy of ${assetsDirName} resolved to ${assetsDir}`)

    // copy include dir
    const includeDir = resolve(baseDir, 'include');
    if (existsSync(includeDir)) {
        console.log(`[${pluginName}] - Copy include to ${outdirName}/include`)
        const targetDir = resolve(outDir, 'include');
        copyFilesSync(includeDir, targetDir, override);
    }
}

/** resolves relative or absolute paths to a path inside the out directory
 * for example D:/myFile.txt would resolve to outDir/myFile.txt
 * wherereas "some/relative/path" would become outDir/some/relative/path
 * @param {string} outDir
 * @param {string} pathValue
 */
function resolvePath(outDir, pathValue) {
    if (isAbsolute(pathValue)) {
        var exists = existsSync(pathValue);
        if (!exists) return null;
        var stats = exists && statSync(pathValue);
        if (stats.isDirectory()) {
            const dirName = pathValue.replaceAll('\\', '/').split('/').pop();
            if (!dirName) return null;
            return resolve(outDir, dirName);
        }
        const fileName = pathValue.replaceAll('\\', '/').split('/').pop();
        if (!fileName) return null;
        return resolve(outDir, fileName);
    }
    return resolve(outDir, pathValue);
}