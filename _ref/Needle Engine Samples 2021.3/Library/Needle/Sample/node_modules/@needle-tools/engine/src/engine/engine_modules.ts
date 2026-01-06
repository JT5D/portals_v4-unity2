
/**
 * External dependencies that are loaded on demand either by the engine automatically when needed or they can be loaded manually by calling the `load` function.  
 * 
 * Use the `ready` function to wait for the module to be loaded if you do not wand to trigger a load.
 * 
 * If a module is already loaded it's also available in the `MODULE` variable.
 */
export namespace MODULES {

    export namespace RAPIER_PHYSICS {
        export type TYPE = typeof import("@dimforge/rapier3d-compat");
        export let MODULE: TYPE;
        export let MAYBEMODULE: TYPE | null = null;

        const callbacks: Array<(module: TYPE) => void> = [];
        /** Wait for the module to be loaded (doesn't trigger a load) */
        export function ready(): Promise<TYPE> {
            if (MODULE) return Promise.resolve(MODULE);
            return new Promise((resolve) => { callbacks.push(resolve); });
        };
        /** Load the module */
        export async function load(): Promise<TYPE> {
            if (MODULE) return MODULE;
            const module = await import("@dimforge/rapier3d-compat");
            MODULE = module;
            MAYBEMODULE = module;
            callbacks.forEach((callback) => callback(module));
            callbacks.length = 0;
            return module;
        }

    }

    export namespace POSTPROCESSING {

        export type TYPE = typeof import("postprocessing");
        export let MODULE: TYPE;
        export let MAYBEMODULE: TYPE | null = null;

        const callbacks: Array<(module: TYPE) => void> = [];
        /** Wait for the module to be loaded (doesn't trigger a load) */
        export function ready(): Promise<TYPE> {
            if (MODULE) return Promise.resolve(MODULE);
            return new Promise((resolve) => { callbacks.push(resolve); });
        };

        /** Load the module */
        export async function load(): Promise<TYPE> {
            if (MODULE) return MODULE;
            const module = await import("postprocessing");
            MODULE = module;
            MAYBEMODULE = module;
            callbacks.forEach((callback) => callback(module));
            callbacks.length = 0;
            return module;
        }
    }

    export namespace POSTPROCESSING_AO {

        export type TYPE = typeof import("n8ao");
        export let MODULE: TYPE;
        export let MAYBEMODULE: TYPE | null = null;

        const callbacks: Array<(module: TYPE) => void> = [];
        /** Wait for the module to be loaded (doesn't trigger a load) */
        export function ready(): Promise<TYPE> {
            if (MODULE) return Promise.resolve(MODULE);
            return new Promise((resolve) => { callbacks.push(resolve); });
        };

        /** Load the module */
        export async function load(): Promise<TYPE> {
            if (MODULE) return MODULE;
            const module = await import("n8ao");
            MODULE = module;
            MAYBEMODULE = module;
            callbacks.forEach((callback) => callback(module));
            callbacks.length = 0;
            return module;
        }
    }
}