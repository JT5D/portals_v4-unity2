import fs, { existsSync, statSync } from 'fs';
import crypto from 'crypto';


/** Create a file containing information about the build inside the build directory
 * @param {String} buildDirectory 
 */
export function createBuildInfoFile(buildDirectory) {
    if (!buildDirectory) {
        console.warn("WARN: Can not create build info file because \"buildDirectory\" is not defined");
        return;
    }
    // start creating the buildinfo
    const buildInfo = {
        time: new Date().toISOString(),
        totalsize: 0,
        files: []
    };
    console.log(`[needle-buildinfo] - Begin collecting files in \"${buildDirectory}\"`);
    recursivelyCollectFiles(buildDirectory, "", buildInfo);
    const buildInfoPath = `${buildDirectory}/needle.buildinfo.json`;
    const totalSizeInMB = buildInfo.totalsize / 1024 / 1024;
    console.log(`[needle-buildinfo] - Collected ${buildInfo.files.length} files (${totalSizeInMB.toFixed(2)} MB). Writing build info to \"${buildInfoPath}\"`);
    const str = JSON.stringify(buildInfo);
    fs.writeFileSync(buildInfoPath, str);
    if(!existsSync(buildDirectory)) {
        console.warn(`WARN: Could not write build info file to \"${buildInfoPath}\"`);
        return;
    }
    console.log(`[needle-buildinfo] - Build info file successfully written to \"${buildInfoPath}\"`);
}

/** Recursively collect all files in a directory
 * @param {String} directory to search
 * @param {{ files: Array<{path:string, hash:string, size:number}>, totalsize:number }} info
 */
function recursivelyCollectFiles(directory, path, info) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            // make sure we never collect files inside node_modules
            if (entry.name === "node_modules") {
                console.warn("WARN: Skipping node_modules directory at " + path);
                continue;
            }
            const newPath = path?.length <= 0 ? entry.name : `${path}/${entry.name}`;
            const newDirectory = `${directory}/${entry.name}`;
            console.log(`[needle-buildinfo] - Collect files in \"/${newPath}\"`);
            recursivelyCollectFiles(newDirectory, newPath, info);
        } else {
            const relpath = path?.length <= 0 ? entry.name : `${path}/${entry.name}`;
            // console.log("[needle-buildinfo] - New File: " + relpath);
            const filehash = crypto.createHash('sha256');
            const fullpath = `${directory}/${entry.name}`;
            filehash.update(fs.readFileSync(fullpath));
            const stats = statSync(fullpath);
            info.files.push({
                path: relpath,
                hash: filehash.digest('hex'),
                size: stats.size
            });
            info.totalsize += stats.size;
        }
    }
}