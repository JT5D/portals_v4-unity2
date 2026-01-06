import { resolveLicense } from '../common/license.js';
import { loadConfig } from './config.js';

/**
 * This plugin is used to apply the license to the needle engine.  
 * @param {string} command - The command that is being run
 * @param {object} config - The config object
 * @param {import('../types/userconfig.js').userSettings} userSettings
 */
export const needleLicense = (command, config, userSettings) => {
    let license = undefined;

    return {
        name: "needle:license",
        enforce: 'pre',
        async configResolved() {

            let team = userSettings?.license?.team;
            if (!team) {
                const meta = await loadConfig(null);
                if (meta) {
                    team = meta.license?.team;
                }
            }

            license = await resolveLicense({
                team: team,
                accessToken: userSettings?.license?.accessToken,
                loglevel: userSettings?.debugLicense === true ? "verbose" : undefined
            });

        },
        async transform(src, id) {
            const isNeedleEngineFile = id.includes("engine/engine_license") || id.includes("needle-tools_engine");
            // sometimes the actual license parameter is in a unnamed chunk file
            const isViteChunkFile = id.includes("chunk") && id.includes(".vite");
            if (isNeedleEngineFile || isViteChunkFile) {

                if (!license) {
                    return;
                }

                const index = src.indexOf("NEEDLE_ENGINE_LICENSE_TYPE");
                if (index >= 0) {
                    const end = src.indexOf(";", index);
                    if (end >= 0) {
                        const line = src.substring(index, end);
                        const replaced = "NEEDLE_ENGINE_LICENSE_TYPE = \"" + license + "\"";
                        src = src.replace(line, replaced);
                        return { code: src, map: null }
                    }
                }
            }
        }
    }
};
