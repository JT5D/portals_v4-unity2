import { LCP } from "./lcp.js";

/**
 * @param args - The arguments to initialize the performance analytics with.
 */
export module NeedleEnginePerformanceAnalytics {
    export function init(...args: Array<"lcp">) {
        if (args.includes("lcp"))
            LCP.observe();
    }
}