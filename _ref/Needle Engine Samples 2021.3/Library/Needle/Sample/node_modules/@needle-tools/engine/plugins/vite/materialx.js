import { existsSync } from 'fs';

const materialx_packagejson_path = "node_modules/@needle-tools/materialx/package.json";
const materialx_import_chunk = `
import { useNeedleMaterialX } from "@needle-tools/materialx/needle";
useNeedleMaterialX();
`

/**
 * Vite plugin to automatically setup the MaterialX loader for Needle Engine.
 * @param {string} command 
 * @param {object} config
 * @param {import('../types/userconfig.js').userSettings} userSettings
 * @returns {import('vite').Plugin}
 */
export const needleMaterialXLoader = (command, config, userSettings) => {

    return {
        name: 'needle-materialx-loader',
        transform: (code, id) => {
            if (id.endsWith("src/main.ts")) {
                if (userSettings?.loadMaterialX !== false && existsSync(materialx_packagejson_path)) {
                    if (!code.includes("@needle-tools/materialx")) {
                        console.log("[needle-materialx-loader] Adding MaterialX import to main.ts");
                        code = materialx_import_chunk + "\n" + code;
                    }
                }
            }
            return code;
        }
    }
}