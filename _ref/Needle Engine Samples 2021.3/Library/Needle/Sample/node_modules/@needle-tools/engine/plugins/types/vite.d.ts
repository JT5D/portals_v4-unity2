import { needleConfig, needleMeta } from "./needleConfig.d.ts";
import { userSettings } from "./userconfig.d.ts";

export declare function needlePlugins(command: import("vite").ConfigEnv["command"], meta?: needleMeta | null, userSettings?: userSettings): Promise<any>;

/**
 * Loads the generated needle meta file
 */
export declare function loadConfig(path: string | null = null): Promise<needleMeta | null>;

/**
 * Returns true if the project is configured to use gzip compression
 */
export declare function useGzip(config?: needleConfig): boolean;