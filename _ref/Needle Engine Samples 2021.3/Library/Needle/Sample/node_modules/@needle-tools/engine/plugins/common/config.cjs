const { existsSync } = require("fs");

/**
 * 
 * @returns {import("../types").needleConfig | null}
 */
module.exports.getConfig = function () {
    const workingDirectory = process.cwd();
    const configPath = workingDirectory + "/needle.config.json";
    if (!existsSync(configPath)) {
        return null;
    }
    /** @type {import("../types").needleConfig} */
    const needleConfig = require(workingDirectory + "/needle.config.json");
    return needleConfig;
}

/**
 * @returns {import("../types").needleMeta | null}
 */
module.exports.getMeta = function () {
    const workingDirectory = process.cwd();
    const needleConfig = module.exports.getConfig();
    if (needleConfig?.codegenDirectory) {
        const metaPath = workingDirectory + "/" + needleConfig.codegenDirectory + "/meta.json";
        /**@type {import("../types").needleMeta} */
        const meta = require(metaPath);
        return meta;
    }
    return null;
}
