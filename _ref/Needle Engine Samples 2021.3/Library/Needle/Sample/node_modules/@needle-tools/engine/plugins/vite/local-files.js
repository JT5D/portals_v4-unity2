import https from 'https';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { start } from 'repl';

/** 
 * @typedef {{pluginContext:import('rollup').TransformPluginContext, cache:Cache, command:string, viteConfig:import("vite").ResolvedConfig | null}} Context
 */

const debug = false;

/**
 * Checks if the local files plugin is enabled in user settings.
 * @param {import('../types/userconfig.js').userSettings} userSettings - The user settings object
 */
export const makeFilesLocalIsEnabled = (userSettings) => {
    if (typeof userSettings?.makeFilesLocal === "object") return userSettings?.makeFilesLocal?.enabled === true;
    return userSettings?.makeFilesLocal === true;
}

/**
 * Download files and rewrite code
 * @param {string} command - The command that is being run
 * @param {object} config - The config object
 * @param {import('../types/userconfig.js').userSettings} userSettings
 * @returns {import('vite').Plugin | null}
 */
export const needleMakeFilesLocal = (command, config, userSettings) => {

    if (!makeFilesLocalIsEnabled(userSettings)) {
        return null;
    }

    console.log(`[needle:local-files] Local files plugin is enabled`);

    const cache = new Cache();

    /** @type {import("vite").ResolvedConfig | null} */
    let viteConfig = null;

    /** @type {import("vite").Plugin} */
    const plugin = {
        name: "needle:local-files",
        // enforce: 'pre', // explictly DON'T define enforce:pre because of svelte postcss compat
        apply: "build",
        configResolved(config) {
            viteConfig = config;
        },
        // transform bundle
        async transform(src, _id) {
            src = await makeLocal(src, "ext/", "", {
                pluginContext: this,
                cache: cache,
                command: command,
                viteConfig: viteConfig,
            });
            return {
                code: src,
                map: null,
            };
        },
        buildEnd() {
            const map = cache.map;
            console.log(""); // Make a new line for better readability
            console.log(`[needle:local-files] Made ${map.size} files local:`);
            for (const [key, value] of map.entries()) {
                console.log(`- ${key} → ${value}`);
            }
        }
    }
    return plugin;
}

/**
 * Rewrites the source code to make local files
 * @param {string} src - The source code to rewrite
 * @param {string} basePath - The base path where the files will be saved
 * @param {string} currentDir - The current directory of the file being processed
 * @param {Context} context - The Vite plugin context and command
 */
async function makeLocal(src, basePath, currentDir, context) {

    const command = context.command;

    if (debug) {
        // Find all urls in the source code.
        // Exclude URLs inside comments, like: 
        // - // https://example.com
        // - /* ... https://example.com ... */
        // - @link https://example.com
        // - * ... https://example.com
        const urlRegexExcludingComments = /(?<!\/\/.*)(?<!\/\*.*)(?<!@link\s+)(["'])(https?:\/\/[^\s'"]+?)\1/g;
        let match0;
        while ((match0 = urlRegexExcludingComments.exec(src)) !== null) {
            const url = match0[2];
            if (debug) console.log(`\nFound URL: ${url} in ${currentDir}`);
        }
    }

    // Google Fonts URLs
    while (true) {
        const match = /["'](https:\/\/fonts\.googleapis\.com\/.+?)["']/g.exec(src);
        if (match === null) {
            break;
        }
        const url = match[1];
        if (debug) console.log(`\nFound google font URL: ${url}`);
        // Check if the font URL is already in the cache
        const cachedPath = context.cache.getFromCache(url);
        if (cachedPath) {
            if (debug) console.log(`Using cached font URL: ${cachedPath}`);
            src = src.replace(url, cachedPath);
            continue; // Skip downloading if already cached
        }
        let font = await downloadText(url);
        const familyNameMatch = /family=([^&]+)/.exec(url);
        const familyName = familyNameMatch ? getValidFilename(familyNameMatch[1], font) : (new URL(url).pathname.split('/').pop());
        font = await makeLocal(font, basePath, basePath, context);
        const fontFileName = `font-${familyName}.css`;
        const outputPath = basePath + fontFileName;
        let newPath;
        if (command === 'build') {
            const referenceId = context.pluginContext.emitFile({
                type: 'asset',
                fileName: outputPath,
                source: font,
            });
            const localPath = `${context.pluginContext.getFileName(referenceId)}`;
            newPath = getRelativeToBasePath(localPath, currentDir);
            // ensureFileExists(localPath, font);
        }
        else {
            // Create base64 URL for dev mode
            const base64Font = Buffer.from(font).toString('base64');
            newPath = `data:text/css;base64,${base64Font}`;
        }
        if (newPath) {
            context.cache.addToCache(url, newPath);
            src = src.replace(url, newPath);
        }
    }

    // Google Fonts gstatic URLs
    while (true) {
        const match = /["'(](https:\/\/fonts\.gstatic\.com\/)(.+?)["')]/g.exec(src);
        if (match === null) {
            break;
        }
        const fontPath = match[2];
        const url = match[1] + fontPath;
        if (debug) console.log(`\nFound gstatic URL: ${url}`);
        // Check if the font URL is already in the cache
        const cachedPath = context.cache.getFromCache(url);
        if (cachedPath) {
            if (debug) console.log(`Using cached gstatic font URL: ${cachedPath}`);
            src = src.replace(url, cachedPath);
            continue; // Skip downloading if already cached
        }
        const font = await downloadBinary(url);
        const filename = getValidFilename(fontPath, font);
        if (debug) console.log(`Saving font to: ${basePath + filename}`);
        let newPath;
        if (command === 'build') {
            const referenceId = context.pluginContext.emitFile({
                type: 'asset',
                fileName: basePath + filename,
                source: font,
            });
            const localPath = `${context.pluginContext.getFileName(referenceId)}`;
            newPath = getRelativeToBasePath(localPath, currentDir);
            // ensureFileExists(localPath, font);
        } else {
            // Create base64 URL for dev mode
            const base64Font = Buffer.from(font).toString('base64');
            newPath = `data:text/css;base64,${base64Font}`;
        }
        context.cache.addToCache(url, newPath);
        src = src.replace(url, newPath);
    }

    // Load QRCode.js
    while (true) {
        // https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@gh-pages/qrcode.min.js
        const match = /["'](https:\/\/cdn\.jsdelivr\.net\/gh\/davidshimjs\/qrcodejs@[^'"]+?\/qrcode\.min\.js)["']/g.exec(src);
        if (match === null) {
            break;
        }
        const url = match[1];
        if (debug) console.log(`\nFound QR code URL: ${url}`);
        // Check if the QR code URL is already in the cache
        const cachedPath = context.cache.getFromCache(url);
        if (cachedPath) {
            if (debug) console.log(`Using cached QR code URL: ${cachedPath}`);
            src = src.replace(url, cachedPath);
            continue; // Skip downloading if already cached
        }
        const qrCode = await downloadBinary(url);
        const filename = getValidFilename(url, qrCode);
        if (debug) console.log(`Saving QR code to: ${basePath + filename}`);
        let newPath;
        if (command === 'build') {
            const referenceId = context.pluginContext.emitFile({
                type: 'asset',
                fileName: basePath + filename,
                source: qrCode,
            });
            const localPath = `${context.pluginContext.getFileName(referenceId)}`;
            newPath = getRelativeToBasePath(localPath, currentDir);
            // ensureFileExists(localPath, qrCode);
        } else {
            // create base64 URL for dev mode
            const base64QrCode = Buffer.from(qrCode).toString('base64');
            newPath = `data:application/javascript;base64,${base64QrCode}`;
        }
        context.cache.addToCache(url, newPath);
        src = src.replace(url, newPath);
    }

    // Polyhaven.org URLs
    let startIndex = 0;
    while (true) {
        const match = /["'](https:\/\/dl\.polyhaven\.org\/file\/.+?)["']/g.exec(src.slice(startIndex));
        if (match === null) {
            break;
        }
        startIndex += match.index + match[0].length; // Update startIndex to continue searching
        const url = match[1];
        if (url.endsWith("/")) {
            if (debug) console.warn(`Skipping Polyhaven URL that ends with a slash: ${url}`);
            continue; // Skip URLs that end with a slash
        }
        if (url.includes("\"") || url.includes("'")) {
            if (debug) console.warn(`Skipping Polyhaven URL with quotes: ${url}`);
            continue; // Skip URLs with quotes
        }
        if (debug) console.log(`\nFound Polyhaven URL: ${url}`);
        // Check if the Polyhaven URL is already in the cache
        const cachedPath = context.cache.getFromCache(url);
        if (cachedPath) {
            if (debug) console.log(`Using cached Polyhaven URL: ${cachedPath}`);
            src = src.replace(url, cachedPath);
            continue; // Skip downloading if already cached
        }
        const polyhavenFile = await downloadBinary(url);
        const filename = getValidFilename(url, polyhavenFile);
        if (debug) console.log(`Saving Polyhaven file to: ${basePath + filename}`);
        let newPath;
        if (command === 'build') {
            const referenceId = context.pluginContext.emitFile({
                type: 'asset',
                fileName: basePath + filename,
                source: polyhavenFile,
            });
            const localPath = `${context.pluginContext.getFileName(referenceId)}`;
            newPath = getRelativeToBasePath(localPath, currentDir);
            // ensureFileExists(localPath, polyhavenFile);
        } else {
            // Create base64 URL for dev mode
            const base64PolyhavenFile = Buffer.from(polyhavenFile).toString('base64');
            newPath = `data:application/octet-stream;base64,${base64PolyhavenFile}`;
        }
        if (newPath) {
            context.cache.addToCache(url, newPath);
            src = src.replace(url, newPath);
        }
    }

    return src;

    // /**
    //  * Ensures that a file exists at the specified relative path with the given content.
    //  * If the file does not exist, it will be created with the provided content.
    //  * @param {string} relPath - The relative path to the file
    //  * @param {string|Uint8Array} content - The content to write to the file
    //  * @returns {void}
    //  */
    // function ensureFileExists(relPath, content) {
    //     const outputPath = context.viteConfig?.build?.outDir || "dist";
    //     const fullPath = resolve(outputPath, relPath);
    //     if (!existsSync(fullPath)) {
    //         if (debug) console.log(`Creating file: ${fullPath}`);
    //         const dir = resolve(fullPath, '..');
    //         mkdirSync(dir, { recursive: true });
    //         writeFileSync(fullPath, content);
    //     }
    // }
}


class Cache {
    __cache = new Map();
    /**
     * Adds a key-value pair to the cache.
     * @param {string} key - The key to store the value under
     * @param {string|Uint8Array} value - The value to store in the cache
     * @returns {void}
     */
    addToCache(key, value) {
        if (this.__cache.has(key)) {
            if (debug) console.warn(`Key ${key} already exists in cache, overwriting.`);
        }
        this.__cache.set(key, value);
    }
    /**
     * Retrieves a value from the cache by its key.
     * @param {string} key - The key to look up in the cache
     */
    getFromCache(key) {
        if (this.__cache.has(key)) {
            return this.__cache.get(key);
        } else {
            return null;
        }
    }
    get map() {
        return this.__cache;
    }
}


/**
 * Returns a relative path based on the base path.
 * @param {string} path - The path to check
 * @param {string | undefined | null} basePath - The base path to compare against
 * @return {string} - The relative path if it starts with the base path, otherwise the original path
 */
function getRelativeToBasePath(path, basePath) {
    if (basePath?.length && path.startsWith(basePath)) {
        return "./" + path.substring(basePath.length);
    }
    return path;
}


/**
 * Generates a valid filename from a given path.
 * @param {string} path - The path to generate a filename from
 * @param {string|Uint8Array} content - The content to hash for uniqueness (not used in this example)
 */
function getValidFilename(path, content) {
    if (path.startsWith("http:") || path.startsWith("https:")) {
        const url = new URL(path);
        const pathParts = url.pathname.split('/');
        const filename = pathParts.pop() || 'file';
        const nameParts = filename.split('.');
        const nameWithoutExt = nameParts.slice(0, -1).join('.');
        path = `${nameWithoutExt}-${createContentMd5(url.host + pathParts.join('/'))}.${nameParts.pop() || 'unknown'}`;
    }

    // Remove any characters that are not valid in filenames
    let name = path.replace(/[^a-z0-9_\-\.\+]/gi, '-');

    const maxLength = 200;
    if (path.length > maxLength) {
        // If the name is too long, hash it to create a unique identifier
        const hash = createContentMd5(content);
        let ext = "";
        const extIndex = name.lastIndexOf('.');
        if (extIndex !== -1) {
            ext = name.substring(extIndex + 1);
            name = name.substring(0, extIndex);
        }
        name = `${name.substring(0, maxLength)}-${hash}${ext ? `.${ext}` : ''}`;
    }
    return name;

}

/**
 * Creates a hash of the content using MD5.
 * @param {string|Uint8Array} str - The content to hash
 */
function createContentMd5(str) {
    return createHash('md5')
        .update(str)
        .digest('hex');
}


/**
 * @param {string} url - The URL of the font to download
 */
function downloadText(url) {
    return new Promise(((res, rej) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                console.log();
                console.error(`Failed to download (${response.statusCode}): ${url}`);
                rej(new Error(`Failed to download (${response.statusCode}): ${url}`));
                return;
            }

            console.log(""); // Make a new line for better readability
            console.log(`[needle:local-files] Make local: ${url}`);

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                // Here you can save the data to a file or process it as needed
                if (debug) console.log(`Downloaded from ${url}`);
                res(data);
            });
        });
    }))
}

function downloadBinary(url) {
    return new Promise((res, rej) => {
        https.get(url, (response) => {

            // Handle redirects
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                if (debug) console.log(`Redirecting to ${response.headers.location}`);
                return downloadBinary(response.headers.location).then(res).catch(rej);
            }

            if (response.statusCode !== 200) {
                console.log();
                console.error(`Failed to download (${response.statusCode}): ${url}`);
                rej(new Error(`Failed to download (${response.statusCode}): ${url}`));
                return;
            }

            console.log(""); // Make a new line for better readability
            console.log(`[needle:local-files] Make local: ${url}`);

            const chunks = [];
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            response.on('end', () => {
                // Here you can save the data to a file or process it as needed
                if (debug) console.log(`Downloaded from ${url}`);
                res(Buffer.concat(chunks));
            });
        });
    });
}