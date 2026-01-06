/**
 * External dependencies that are loaded on demand either by the engine automatically when needed or they can be loaded manually by calling the `load` function.
 *
 * Use the `ready` function to wait for the module to be loaded if you do not wand to trigger a load.
 *
 * If a module is already loaded it's also available in the `MODULE` variable.
 */
export declare namespace MODULES {
    namespace RAPIER_PHYSICS {
        type TYPE = typeof import("@dimforge/rapier3d-compat");
        let MODULE: TYPE;
        let MAYBEMODULE: TYPE | null;
        /** Wait for the module to be loaded (doesn't trigger a load) */
        function ready(): Promise<TYPE>;
        /** Load the module */
        function load(): Promise<TYPE>;
    }
    namespace POSTPROCESSING {
        type TYPE = typeof import("postprocessing");
        let MODULE: TYPE;
        let MAYBEMODULE: TYPE | null;
        /** Wait for the module to be loaded (doesn't trigger a load) */
        function ready(): Promise<TYPE>;
        /** Load the module */
        function load(): Promise<TYPE>;
    }
    namespace POSTPROCESSING_AO {
        type TYPE = typeof import("n8ao");
        let MODULE: TYPE;
        let MAYBEMODULE: TYPE | null;
        /** Wait for the module to be loaded (doesn't trigger a load) */
        function ready(): Promise<TYPE>;
        /** Load the module */
        function load(): Promise<TYPE>;
    }
}
