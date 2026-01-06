import { LCP } from "./lcp.js";
/**
 * @param args - The arguments to initialize the performance analytics with.
 */
export var NeedleEnginePerformanceAnalytics;
(function (NeedleEnginePerformanceAnalytics) {
    function init(...args) {
        if (args.includes("lcp"))
            LCP.observe();
    }
    NeedleEnginePerformanceAnalytics.init = init;
})(NeedleEnginePerformanceAnalytics || (NeedleEnginePerformanceAnalytics = {}));
//# sourceMappingURL=index.js.map