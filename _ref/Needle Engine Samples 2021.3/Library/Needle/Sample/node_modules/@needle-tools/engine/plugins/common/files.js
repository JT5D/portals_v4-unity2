import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * @param {string} src
 * @param {string} dest
 * @param {boolean} override
 * @param {{count:number} | undefined} ctx
 */
export function copyFilesSync(src, dest, override = true, ctx = undefined) {
    if (dest === null) {
        console.log(`[needle-copy] - Copy ${src} to ${dest} - dest is null`)
        return;
    }
    let exists = existsSync(src);
    let stats = exists && statSync(src);
    let isDirectory = exists && typeof stats != "boolean" && stats.isDirectory();
    if (isDirectory) {
        if (!existsSync(dest))
            mkdirSync(dest, { recursive: true });
        readdirSync(src).forEach(function (childItemName) {
            // recurse
            copyFilesSync(join(src, childItemName), join(dest, childItemName), override, ctx);
        });
    }
    else if (override || !existsSync(dest)) {
        if (exists) {
            if (ctx) {
                ctx.count += 1;
            }
            copyFileSync(src, dest);
        }
        else console.warn(`[needle-copy] - File at ${src} does not exist`);
    }
};