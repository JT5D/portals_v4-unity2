



/** 
 * @type {() => import("vite").Plugin}
 */
export function viteFixWorkerImport() {
    return {
        name: 'vite-rewriteWorkerImport',
        config: function (config, env) {
            if (!config.build) {
                config.build = {};
            }
            if (!config.build.rollupOptions) {
                config.build.rollupOptions = {};
            }
            if (!config.build.rollupOptions.plugins) {
                config.build.rollupOptions.plugins = [];
            }
            if (!Array.isArray(config.build.rollupOptions.plugins)) {
                const value = config.build.rollupOptions.plugins;
                config.build.rollupOptions.plugins = [];
                config.build.rollupOptions.plugins.push(value);
            }
            config.build.rollupOptions.plugins.push(rollupFixWorkerImport({ logFail: false }));
        }
    }
}



// https://regex101.com/r/hr01H4/1
const regex = /new\s+Worker\s*\(\s*new\s+URL\s*\(\s*(?:\/\*.*?\*\/\s*)?\"(?<url>[^"]+)\"\s*,\s*(?<base>import\.meta\.url|self\.location)[^)]*\)/gm;



/** 
 * @type {(opts?: {logFail:boolean}) => import("vite").Plugin} 
*/
export function rollupFixWorkerImport(opts = { logFail: true }) {
    return {
        name: 'rewriteWorkerImport',
        renderChunk: {
            order: 'post',
            async handler(code, chunk, outputOptions) {
                let regexMatchedWorkerCode = false;
                const newWorkerStartIndex = code.indexOf("new Worker");
                if (newWorkerStartIndex >= 0) {
                    const res = code.replace(regex, (match, url, _base) => {
                        regexMatchedWorkerCode = true;
                        // console.log("WORKER?", url)
                        if (url?.startsWith("/")) {
                            console.log(`[rollup] Rewrite worker import in ${chunk.fileName}`);
                            // Make url file-relative
                            const newUrl = url.replace(/^\//, "");
                            // For CORS issues we need to use importScripts: https://linear.app/needle/issue/NE-6572#comment-ea5dc65e
                            const output = `/* new-worker */ new Worker(URL.createObjectURL(new Blob(["import '" + \`\${new URL('./${newUrl}', import.meta.url).toString()}\` + "';"], { type: 'text/javascript' }))`;
                            console.log("[rollup] Did rewrite worker output to:", output);
                            return output;
                            // return `new Worker(new URL("./${newUrl}", import.meta.url)`;
                        }
                        return match;
                    });
                    if (!regexMatchedWorkerCode) {

                        const fixedCode = fixWorkerSelfLocation(chunk.fileName, code);
                        if (fixedCode !== code) {
                            return fixedCode;
                        }
                        if (opts?.logFail !== false) {
                            const str = `[...]${code.substring(newWorkerStartIndex, newWorkerStartIndex + 200)}[...]`
                            console.warn(`\n[rollup] Worker import in ${chunk.fileName} was not rewritten: ${str}`);
                        }
                    }
                    return res;
                }
            },
        }
    };
}


/**
 * Fix worker self.location to import.meta.url
 * @param {string} filename
 * @param {string} code
 */
function fixWorkerSelfLocation(filename, code) {
    let lastIndex = 0;
    while (true) {
        const startIndex = code.indexOf("new Worker", lastIndex);
        if (startIndex < 0) break;
        let index = startIndex + 1;
        let endIndex = -1;
        let openingBraceCount = 0;
        let foundAnyOpening = false;
        while (true) {
            const char = code[index];
            if (char === "(") {
                openingBraceCount++;
                foundAnyOpening = true;
            }
            if (char === ")") openingBraceCount--;
            if (openingBraceCount === 0 && foundAnyOpening) {
                endIndex = index;
                break;
            }
            // console.log(openingBraceCount, char, index, code.length);
            index++;
            if (index >= code.length) break;
        }
        if (endIndex > startIndex) {
            const workerCode = code.substring(startIndex, endIndex + 1);
            if (workerCode.indexOf("self.location") >= 0) {
                const fixedCode = workerCode.replace("self.location", "import.meta.url");
                code = code.substring(0, startIndex) + fixedCode + code.substring(endIndex + 1);
                lastIndex = startIndex + fixedCode.length;
                console.log(`[rollup] Rewrite worker 'self.location' to 'import.meta.url' in ${filename}`);
            } else {
                lastIndex = endIndex;
            }
        }
        else {
            lastIndex = startIndex + "new Worker".length;
        }
    }
    return code;
}