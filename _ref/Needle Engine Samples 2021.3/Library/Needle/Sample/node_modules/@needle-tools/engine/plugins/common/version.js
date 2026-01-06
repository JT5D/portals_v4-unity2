import { existsSync, readFileSync } from "fs";

/** @returns {string|null} */
export function tryGetNeedleEngineVersion() {
    const needleEnginePackageJsonPath = process.cwd() + "/node_modules/@needle-tools/engine/package.json";
    if (existsSync(needleEnginePackageJsonPath)) {
        const content = readFileSync(needleEnginePackageJsonPath).toString();
        const json = JSON.parse(content);
        const version = json.version;
        return version;
    }
    // check if we're in the needle engine package directory (for a release)
    const packageJsonPath = process.cwd() + "/package.json";
    if (existsSync(packageJsonPath)) {
        const content = readFileSync(packageJsonPath).toString();
        const json = JSON.parse(content);
        if (json.name === "@needle-tools/engine") {
            const version = json.version;
            return version;
        }
    }
    return null;
}

/**
 * @param {string} packageName
 */
export function tryGetPackageVersion(packageName) {
    const packageJsonPath = process.cwd() + `/node_modules/${packageName}/package.json`;
    if (existsSync(packageJsonPath)) {
        const content = readFileSync(packageJsonPath, "utf8");
        if (content) {
            const json = JSON.parse(content);
            const version = json.version;
            return version;
        }
    }
}