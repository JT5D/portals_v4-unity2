/**
 * External dependencies that are loaded on demand either by the engine automatically when needed or they can be loaded manually by calling the `load` function.
 *
 * Use the `ready` function to wait for the module to be loaded if you do not wand to trigger a load.
 *
 * If a module is already loaded it's also available in the `MODULE` variable.
 */
export var MODULES;
(function (MODULES) {
    let RAPIER_PHYSICS;
    (function (RAPIER_PHYSICS) {
        RAPIER_PHYSICS.MAYBEMODULE = null;
        const callbacks = [];
        /** Wait for the module to be loaded (doesn't trigger a load) */
        function ready() {
            if (RAPIER_PHYSICS.MODULE)
                return Promise.resolve(RAPIER_PHYSICS.MODULE);
            return new Promise((resolve) => { callbacks.push(resolve); });
        }
        RAPIER_PHYSICS.ready = ready;
        ;
        /** Load the module */
        async function load() {
            if (RAPIER_PHYSICS.MODULE)
                return RAPIER_PHYSICS.MODULE;
            const module = await import("@dimforge/rapier3d-compat");
            RAPIER_PHYSICS.MODULE = module;
            RAPIER_PHYSICS.MAYBEMODULE = module;
            callbacks.forEach((callback) => callback(module));
            callbacks.length = 0;
            return module;
        }
        RAPIER_PHYSICS.load = load;
    })(RAPIER_PHYSICS = MODULES.RAPIER_PHYSICS || (MODULES.RAPIER_PHYSICS = {}));
    let POSTPROCESSING;
    (function (POSTPROCESSING) {
        POSTPROCESSING.MAYBEMODULE = null;
        const callbacks = [];
        /** Wait for the module to be loaded (doesn't trigger a load) */
        function ready() {
            if (POSTPROCESSING.MODULE)
                return Promise.resolve(POSTPROCESSING.MODULE);
            return new Promise((resolve) => { callbacks.push(resolve); });
        }
        POSTPROCESSING.ready = ready;
        ;
        /** Load the module */
        async function load() {
            if (POSTPROCESSING.MODULE)
                return POSTPROCESSING.MODULE;
            const module = await import("postprocessing");
            POSTPROCESSING.MODULE = module;
            POSTPROCESSING.MAYBEMODULE = module;
            callbacks.forEach((callback) => callback(module));
            callbacks.length = 0;
            return module;
        }
        POSTPROCESSING.load = load;
    })(POSTPROCESSING = MODULES.POSTPROCESSING || (MODULES.POSTPROCESSING = {}));
    let POSTPROCESSING_AO;
    (function (POSTPROCESSING_AO) {
        POSTPROCESSING_AO.MAYBEMODULE = null;
        const callbacks = [];
        /** Wait for the module to be loaded (doesn't trigger a load) */
        function ready() {
            if (POSTPROCESSING_AO.MODULE)
                return Promise.resolve(POSTPROCESSING_AO.MODULE);
            return new Promise((resolve) => { callbacks.push(resolve); });
        }
        POSTPROCESSING_AO.ready = ready;
        ;
        /** Load the module */
        async function load() {
            if (POSTPROCESSING_AO.MODULE)
                return POSTPROCESSING_AO.MODULE;
            const module = await import("n8ao");
            POSTPROCESSING_AO.MODULE = module;
            POSTPROCESSING_AO.MAYBEMODULE = module;
            callbacks.forEach((callback) => callback(module));
            callbacks.length = 0;
            return module;
        }
        POSTPROCESSING_AO.load = load;
    })(POSTPROCESSING_AO = MODULES.POSTPROCESSING_AO || (MODULES.POSTPROCESSING_AO = {}));
})(MODULES || (MODULES = {}));
//# sourceMappingURL=engine_modules.js.map