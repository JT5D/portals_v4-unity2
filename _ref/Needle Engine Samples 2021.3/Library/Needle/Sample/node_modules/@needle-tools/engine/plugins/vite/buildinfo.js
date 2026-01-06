import { createBuildInfoFile } from '../common/buildinfo.js';
import { waitForBuildPipelineToFinish } from './build-pipeline.js';
import { getOutputDirectory } from './config.js';

let level = 0;

/** Create a buildinfo file in the build directory
 * @param {import('../types').userSettings} userSettings
 * @returns {import('vite').Plugin | null}
 */
export const needleBuildInfo = (command, config, userSettings) => {

    if (userSettings?.noBuildInfo) return null;

    return {
        name: 'needle:buildinfo',
        apply: "build",
        enforce: "post",
        buildStart: () => {
            level++;
        },
        closeBundle: async () => {
            if (--level > 0) {
                console.log("[needle-buildinfo] - Skipped because of nested build");
                return;
            }
            const task = waitForBuildPipelineToFinish();
            if (task instanceof Promise) {
                console.log("[needle-buildinfo] - Waiting for build pipeline to finish");
                await task.catch(() => { }).finally(() => console.log("[needle-buildinfo] - Build pipeline finished!"));
            }
            // wait for gzip
            await delay(500);
            const buildDirectory = getOutputDirectory();
            createBuildInfoFile(buildDirectory);
        }
    }
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}