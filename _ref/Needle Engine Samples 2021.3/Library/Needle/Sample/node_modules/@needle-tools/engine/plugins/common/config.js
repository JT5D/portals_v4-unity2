import { existsSync, readFileSync } from "fs";


/**
 * 
 * @returns {import("../types").needleConfig | null}
 */
export function getConfig() {
    const workingDirectory = process.cwd();
    const configPath = `${workingDirectory}/needle.config.json`;
    if (existsSync(configPath)) {
        const configStr = readFileSync(configPath, "utf8");
        const config = JSON.parse(configStr);
        return config;
    }
    return null;
}

/**
 * 
 * @returns {import("../types").needleMeta | null}
 */
export function getMeta() {
    const workingDirectory = process.cwd();
    const config = getConfig();
    if (config && config.codegenDirectory) {
        const dir = `${workingDirectory}/${config.codegenDirectory}/meta.json`;
        if (existsSync(dir)) {
            const metaStr = readFileSync(dir, "utf8");
            /**@type {import("../types").needleMeta} */
            const meta = JSON.parse(metaStr);
            return meta;
        }
    }
    return null;
}