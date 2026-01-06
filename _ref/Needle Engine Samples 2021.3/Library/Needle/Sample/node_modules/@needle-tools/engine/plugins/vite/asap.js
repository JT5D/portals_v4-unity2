import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { tryParseNeedleEngineSrcAttributeFromHtml } from '../common/needle-engine.js';
import { preloadScriptPaths } from './dependencies.js';
import { makeFilesLocalIsEnabled } from './local-files.js';

const code = `import('@needle-tools/engine/src/asap/needle-asap.ts');`



/**
 * Injects needle asap script into the index.html for when the main needle engine bundle is still being downloaded
 * @param {"build" | "serve"} command
 * @param {import('../types').userSettings} userSettings
 * @returns {Promise<import('vite').Plugin[] | null>}
 */
export const needleAsap = async (command, config, userSettings) => {

    if (userSettings.noAsap) return null;

    fixMainTs();

    if (command != "build") {
        return null;
    }

    let logoSvg = "";
    try {
        const assets = await import("../../src/engine/assets/static.js");
        logoSvg = assets.NEEDLE_LOGO_SVG_URL;
    }
    catch (err) {
        console.warn("Could not load needle logo svg", err.message);
    }

    /** @type {import("vite").ResolvedConfig | null} */
    let viteConfig = null;

    return [{
        name: 'needle:asap',
        configResolved(config) {
            viteConfig = config;
        },
        transformIndexHtml: {
            order: 'pre',
            handler(html, _ctx) {
                /** @type {import('vite').HtmlTagDescriptor[]} */
                const tags = [];

                try {
                    generateGltfPreloadLinks(config, html, tags);
                }
                catch (err) {
                    console.error("Error generating gltf preload links", err);
                }

                if (!makeFilesLocalIsEnabled(userSettings)) {
                    // preconnect to gstatic.com and fonts.googleapis.com to safe 100ms according to lighthouse
                    tags.push({
                        tag: 'link',
                        attrs: {
                            rel: "preconnect",
                            href: "https://fonts.gstatic.com",
                        }
                    });
                    tags.push({
                        tag: 'link',
                        attrs: {
                            rel: "preconnect",
                            href: "https://fonts.googleapis.com",
                        }
                    });
                }

                // we insert the logo late because the logo svg string is quite long
                if (logoSvg?.length) {
                    tags.push({
                        tag: 'link',
                        attrs: {
                            rel: "preload",
                            fetchpriority: "high",
                            as: "image",
                            href: logoSvg,
                            type: "image/svg+xml",
                        }
                    })
                }

                return {
                    html,
                    tags
                }
            }
        },
    },
    {
        name: "needle:asap:post",
        transformIndexHtml: {
            order: 'post',
            handler(html, _ctx) {
                /** @type {import('vite').HtmlTagDescriptor[]} */
                const tags = [];

                if (viteConfig) {
                    // we need to wait for the files to exist
                    generateScriptPreloadLinks(viteConfig, tags);
                }

                return {
                    html,
                    tags
                }
            }
        }
    }]
}

function fixMainTs() {
    // TODO: remove me
    // we could also do this via a transform call - not sure if it's not better for users to see this change that's why i chose to modify the file on disc
    const mainTsFilePath = process.cwd() + '/src/main.ts';
    if (existsSync(mainTsFilePath)) {
        let code = readFileSync(mainTsFilePath, 'utf-8');
        if (code.includes('import \"@needle-tools/engine\"')) {
            console.log("Change main.ts and replace needle engine import with async import");
            code = code.replace(/import \"@needle-tools\/engine\"/g, 'import("@needle-tools/engine") /* async import of needle engine */');
            writeFileSync(mainTsFilePath, code);
        }
    }
}

/**
 * @param {import('vite').ResolvedConfig} _config
 * @param {import('vite').HtmlTagDescriptor[]} tags
 */
function generateScriptPreloadLinks(_config, tags) {
    try {
        const chunks = preloadScriptPaths;
        // console.log("ASAP", chunks)
        if (chunks.length > 0) {
            for (const chunk of chunks) {
                tags.push({
                    tag: 'link',
                    attrs: {
                        rel: "modulepreload",
                        as: "script",
                        href: chunk,
                    }
                });
            }
        }
    }
    catch (err) {
        console.error("Error generating script preload links", err);
    }
}


// https://regex101.com/r/I9k2nx/1
// @ts-ignore
const codegenRegex = /\"(?<gltf>.+(.glb|.gltf)(\?.*)?)\"/gm;

/**
 * @param {import('../types').needleConfig} config
 * @param {string} html
 * @param {import('vite').HtmlTagDescriptor[]} tags 
 **/
function generateGltfPreloadLinks(config, html, tags) {

    // TODO: try to get the <needle-engine src> element src attribute and preload that
    const needleEngineMatches = tryParseNeedleEngineSrcAttributeFromHtml(html);
    if (needleEngineMatches?.length) {
        for (const item of needleEngineMatches) {
            insertPreloadLink(tags, item, "model/gltf+json");
        }
    }


    // TODO: we should export the entrypoint files to our meta file perhaps to make it easier to generate preload links

    // We can not simply preload ALL the files in the assets folder because that would be too much and we don't know what the user ACTUALLY wants
    let codegen_path = "/src/generated/";
    if (config.codegenDirectory) {
        codegen_path = config.codegenDirectory;
    }
    codegen_path = path.join(process.cwd(), codegen_path, "gen.js");
    if (existsSync(codegen_path)) {
        const code = readFileSync(codegen_path, "utf8");
        if (code) {
            const matches = code.matchAll(codegenRegex);
            if (matches) {
                while (true) {
                    const match = matches.next();
                    if (match.done) break;
                    const value = match.value?.groups?.gltf;
                    if (value) {
                        // if it's not a url we need to check if the file exists
                        const isUrl = value.startsWith("http");
                        if (!isUrl) {
                            let filepath = value.split("?")[0];
                            filepath = decodeURIComponent(filepath);
                            const fullpath = path.join(process.cwd(), filepath);
                            if (!existsSync(fullpath)) {
                                console.warn(`[needle:asap] Could not insert head preload link: file not found at \"${filepath}\"`);
                                continue;
                            }
                        }
                        console.log(`[needle:asap] Insert head glTF preload link: ${value}`);
                        insertPreloadLink(tags, value, "model/gltf+json");
                    }
                }
            }
        }
    }
}

/**
 * @param {import('vite').HtmlTagDescriptor[]} tags
 * @param {string} href
 * @param {string} type
 */
function insertPreloadLink(tags, href, type) {
    if (!href) return;
    tags.push({
        tag: 'link',
        attrs: {
            rel: "preload",
            as: "fetch",
            href: href,
            type: type,
            crossorigin: true,
        }
    });
}