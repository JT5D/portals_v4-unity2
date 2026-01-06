import { loadConfig } from "./config.js";
import { tryGetNeedleEngineVersion } from "../common/version.js";
import { getPublicIdentifier as getPublicIdentifier } from "../common/license.js";

// NOTE: ALL DEFINES MUST BE SET HERE! NEVER ADD OR RELY ON DEFINES IN ANY OTHER PLUGIN

/** used to pass config variables into vite.config.define
 * for example "useRapier"
 */

// https://vitejs.dev/config/#using-environment-variables-in-config

/**
 * @param {import('../types').userSettings} userSettings
 */
export const needleDefines = (command, needleEngineConfig, userSettings) => {

    if (!userSettings) userSettings = {};

    let useRapier = true;
    if (needleEngineConfig?.useRapier === false || userSettings?.useRapier === false) useRapier = false;

    let usePostProcessing = true;
    if (userSettings.usePostprocessing === false) {
        usePostProcessing = false;
    }

    return {
        name: 'needle:defines',
        enforce: 'pre',
        async config(viteConfig) {
            // console.log("Update vite defines -------------------------------------------");
            if (!viteConfig.define) viteConfig.define = {};
            const version = tryGetNeedleEngineVersion();
            console.log("Needle Engine Version: " + version, needleEngineConfig?.generator ?? "(unknown generator)");
            if (version)
                viteConfig.define.NEEDLE_ENGINE_VERSION = "\"" + version + "\"";
            if (needleEngineConfig)
                viteConfig.define.NEEDLE_ENGINE_GENERATOR = "\"" + needleEngineConfig.generator + "\"";

            if (useRapier && userSettings?.useRapier !== true) {
                const meta = await loadConfig();
                if (meta && meta.useRapier === false) {
                    useRapier = false;
                }
            }
            // console.log("UseRapier?", useRapier);
            if (viteConfig.define.NEEDLE_USE_RAPIER === undefined) {
                viteConfig.define.NEEDLE_USE_RAPIER = useRapier;
            }

            // TODO: this doesn't make postprocessing optional yet
            if (viteConfig.define.NEEDLE_USE_POSTPROCESSING === undefined) {
                viteConfig.define.NEEDLE_USE_POSTPROCESSING = usePostProcessing;
            }

            // this gives a timestamp containing the timezone
            viteConfig.define.NEEDLE_PROJECT_BUILD_TIME = "\"" + new Date().toString() + "\"";

            const projectId = undefined; // TODO: this needs to be exported by the integration (if any)
            const publicIdentifier = await getPublicIdentifier(projectId, {
                loglevel: userSettings?.debugLicense === true ? "verbose" : undefined,
            }).catch(err => {
                console.warn("Failed to get public identifier:", err.message);
            });
            if (publicIdentifier) {
                viteConfig.define.NEEDLE_PUBLIC_KEY = "\"" + publicIdentifier + "\"";
            }
        }
    }
}