import { writeFile } from 'fs';
import { tryParseNeedleEngineSrcAttributeFromHtml } from '../common/needle-engine.js';



/**
 * @param {'serve' | 'build'} command
 * @param {{} | undefined | null} config
 * @param {import('../types').userSettings} userSettings
 * @returns {import('vite').Plugin[] | null}
 */
export const needleApp = (command, config, userSettings) => {

    if (command !== "build") {
        return null;
    }

    /** @type {Array<import("rollup").OutputChunk>} */
    const entryFiles = new Array();

    let outputDir = "dist";

    /**
     * @type {import('vite').Plugin}
     */
    return [
        {
            name: 'needle:app',
            enforce: "post",
            configResolved(config) {
                outputDir = config.build.outDir || "dist";
            },
            transformIndexHtml: {
                handler: async function (html, context) {
                    const name = context.filename;
                    if (name.includes("index.html")) {
                        if (context.chunk?.isEntry) {
                            try {
                                entryFiles.push(context.chunk);
                                const path = context.chunk.fileName;
                                // console.log("[needle-dependencies] entry chunk imports", {
                                //     name: context.chunk.fileName,
                                //     imports: context.chunk.imports,
                                //     dynamicImports: context.chunk.dynamicImports,
                                //     refs: context.chunk.referencedFiles,
                                // });

                                // TODO: here we try to find the main asset (entrypoint) for this web app. It's a bit hacky right now but we have to assign this url directly to make it work with `gen.js` where multiple needle-apps are on different (or the same) pages.
                                const attribute_src = tryParseNeedleEngineSrcAttributeFromHtml(html);
                                const imported_glbs = Array.from(context.chunk.viteMetadata?.importedAssets?.values() || [])?.filter(f => f.endsWith(".glb") || f.endsWith(".gltf"));

                                const main_asset = attribute_src?.[0] || imported_glbs?.[0];

                                const webComponent = generateNeedleEmbedWebComponent(path, main_asset);
                                await writeFile(`${outputDir}/needle-app.js`, webComponent, (err) => {
                                    if (err) {
                                        console.error("[needle-app] could not create needle-app.js", err);
                                    }
                                    else {
                                        console.log("[needle-app] created needle-app.js");
                                    }
                                });
                            }
                            catch (e) {
                                console.warn("WARN: could not create needle-app.js\n", e);
                            }
                        }
                    }
                }
            },

        }
    ]
}


/**
 * @param {string} filepath
 * @param {string | null} src
 * @returns {string}
 */
function generateNeedleEmbedWebComponent(filepath, src) {


    // filepath is e.g. `assets/index-XXXXXXXX.js`
    // we want to make sure the path is correct relative to where the component will be used
    // this script will be emitted in the output directory root (e.g. needle-embed.js)

    const componentDefaultName = 'needle-app';

    return `

// Needle Engine attributes we want to allow to be overriden
const knownAttributes = [
    "src",
    "background-color", 
    "background-image", 
    "environment-image", 
    "focus-rect",
];

const scriptUrl = new URL(import.meta.url);
const componentName = scriptUrl.searchParams.get("component-name") || '${componentDefaultName}';


if (!customElements.get(componentName)) {
    console.debug(\`Defining needle-app as <\${componentName}>\`);
    customElements.define(componentName, class extends HTMLElement {

        static get observedAttributes() {
            return knownAttributes;
        }

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            const template = document.createElement('template');
            template.innerHTML = \`
                <style>
                    :host {
                        position: relative;
                        display: block;
                        width: max(360px 100%);
                        height: max(240px, 100%);
                        margin: 0;
                        padding: 0;
                    }
                    needle-engine {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                    }
                </style>
            \`;
            this.shadowRoot.appendChild(template.content.cloneNode(true));

            const script = document.createElement('script');
            script.type = 'module';
            const url = new URL('.', import.meta.url);
            this.basePath = this.getAttribute('base-path') || \`\${url.protocol}//\${url.host}\${url.pathname}\`;
            while(this.basePath.endsWith('/')) {
                this.basePath = this.basePath.slice(0, -1);
            }
            script.src = this.getAttribute('script-src') || \`\${this.basePath}/${filepath}\`;
            this.shadowRoot.appendChild(script);

            this.needleEngine = document.createElement('needle-engine');
            this.updateAttributes();
            this.shadowRoot.appendChild(this.needleEngine);

            console.debug(this.basePath, script.src, this.needleEngine.getAttribute("src"));
        }

        onConnectedCallback() {
            console.debug('NeedleEmbed connected to the DOM');
        }

        disconnectedCallback() {
            console.debug('NeedleEmbed disconnected from the DOM');
        }
        
        attributeChangedCallback(name, oldValue, newValue) {
            console.debug(\`NeedleApp attribute changed: \${name} from \${oldValue} to \${newValue}\`);
            this.updateAttributes();
        }

        updateAttributes() {
            console.debug("NeedleApp updating attributes");
            
            const src = this.getAttribute('src') || ${src?.length ? `\`\${this.basePath}/${src}\`` : null};
            if(src) this.needleEngine.setAttribute("src", src);
            else this.needleEngine.removeAttribute("src");

            for(const attr of knownAttributes) {
                
                if(attr === "src") continue; // already handled above

                if(this.hasAttribute(attr)) {
                    this.needleEngine.setAttribute(attr, this.getAttribute(attr));
                }
                else {
                    this.needleEngine.removeAttribute(attr);    
                }
            }
        }
    });
}
else {
    console.warn(\`needle-app <\${componentName}> already defined.\`);
}
`
}