import path from "path";

let isStringifying = false;

/**
 * Patches console methods to capture log messages and send them to the server.
 * This is useful for debugging and logging in the client.
 * @param {"log" | "warn" | "info" | "debug" | "error" | "internal"} level
 * @param {any} message - The log message to capture.
 */
function sendLogToServer(level, ...message) {
    if (isStringifying) return;
    if ("hot" in import.meta) {
        try {
            isStringifying = true;
            // console.time("sendLogToServer");
            message = stringifyLog(message);
            // console.timeEnd("sendLogToServer");
            // keep messages below payload limit
            if (message.length > 100_000) {
                message = message.slice(0, 100_000) + "... <truncated>";
            }
            // @ts-ignore
            import.meta.hot.send("needle:client-log", { level, message: message });
        } catch (e) {
            // silently fail but send a message
            try {
                import.meta.hot.send("needle:client-log", { level: "error", message: `Error during logging: ${e.message}` });
            }
            catch (e2) {
                // fallback failed as well
            }
        }
        finally {
            isStringifying = false;
        }
    }
}

function logHelper(fn, args) {
    const error = new Error();
    const stack = error.stack;
    const caller = stack?.split('\n')[3]; // Get the actual caller
    const path = caller?.trim();
    if (!path) {
        return fn(...args);
    }
    const pathWithoutBrackets = path.replaceAll("(", "").replaceAll(")", "");
    fn(...args, `\n» ${pathWithoutBrackets}`);
}

if (import.meta && "hot" in import.meta) {

    function patchLogs() {
        const originalLog = console.log.bind(console);
        const originalWarn = console.warn.bind(console);
        const originalInfo = console.info.bind(console);
        const originalDebug = console.debug.bind(console);
        const originalError = console.error.bind(console);

        console.log = function (...args) {
            logHelper(originalLog, args);
            sendLogToServer("log", ...args);
        }
        console.warn = (...args) => {
            logHelper(originalWarn, args);
            sendLogToServer("warn", ...args);
        }
        console.info = (...args) => {
            logHelper(originalInfo, args);
            sendLogToServer("info", ...args);
        }
        console.debug = (...args) => {
            logHelper(originalDebug, args);
            sendLogToServer("debug", ...args);
        }
        console.error = (...args) => {
            logHelper(originalError, args);
            sendLogToServer("error", ...args);
        }
        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.info = originalInfo;
            console.debug = originalDebug;
            console.error = originalError;
        }
    }

    const query = new URLSearchParams(window.location.search);
    if (query.has("needle-debug")) {
        patchLogs();
    }
    else {
        // const unpatch = patchLogs();
        // setTimeout(() => {
        //     sendLogToServer("internal", "Stop listening to console.log.");
        //     unpatch();
        // }, 10_000);

        const threshold = 100;
        const devToolsArePotentiallyOpen = window.outerHeight - window.innerHeight > threshold || window.outerWidth - window.innerWidth > threshold;
        if (devToolsArePotentiallyOpen) {
            sendLogToServer("internal", "Console logging is disabled (devtools are open)");
        }
        else {
            sendLogToServer("internal", "Console logging is enabled");
            patchLogs();
        }
    }



    try {
        sendLogToServer("internal", `Page loaded
URL: ${window.location.href}
UserAgent: ${navigator.userAgent}
Screen: ${window.innerWidth} x ${window.innerHeight}px
Device Pixel Ratio: ${window.devicePixelRatio}
Device Memory: ${"deviceMemory" in navigator ? navigator.deviceMemory : "Not available"} GB
Online: ${navigator.onLine}
Language: ${navigator.language}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
Connection: ${"connection" in navigator ? JSON.stringify(navigator.connection) : "Not available"}
User Activation: ${"userActivation" in navigator ? JSON.stringify(navigator.userActivation) : "Not available"}
`);

        if ("gpu" in navigator) {
            // @ts-ignore
            navigator.gpu.requestAdapter()
                .then(adapter => adapter ? adapter.requestDevice() : null)
                .then(device => {
                    if (device) {
                        const adapterInfo = device.adapterInfo;
                        if (adapterInfo) {
                            sendLogToServer("internal", [`WebGPU adapter info`, {
                                vendor: adapterInfo.vendor,
                                architecture: adapterInfo.architecture,
                                device: adapterInfo.device,
                                description: adapterInfo.description,
                                features: adapterInfo.features,
                                limits: adapterInfo.limits
                            }]);
                        }
                    }
                });
        }
    }
    catch (e) {
        // silently fail
        sendLogToServer("error", `Error during initial log: ${e.message}`);
    }

    window.addEventListener('error', (event) => {
        const errorMessage = event.error ? event.error.stack || event.error.message : event.message;
        sendLogToServer("error", errorMessage);
    });
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason ? event.reason.stack || event.reason.message : "Unhandled rejection without reason";
        sendLogToServer("error", `Unhandled promise rejection: ${reason}`);
    });
    window.addEventListener('beforeunload', () => {
        sendLogToServer("internal", "Page is unloading\n\n");
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            sendLogToServer("internal", "Page is hidden");
        }
        else if (document.visibilityState === 'visible') {
            sendLogToServer("internal", "Page is visible again");
        }
        else {
            sendLogToServer("internal", `Page visibility changed to ${document.visibilityState}`);
        }
    });
    window.addEventListener("focus", () => {
        sendLogToServer("internal", "Page gained focus");
    });
    window.addEventListener("blur", () => {
        sendLogToServer("internal", "Page lost focus");
    });
    window.addEventListener('load', () => {
        sendLogToServer("internal", "Page fully loaded");
    });
    window.addEventListener('DOMContentLoaded', () => {
        sendLogToServer("internal", "DOM fully loaded and parsed");
    });
    window.addEventListener('online', () => {
        sendLogToServer("internal", "Browser is online");
    });
    window.addEventListener('offline', () => {
        sendLogToServer("warn", "Browser is offline");
    });
    window.addEventListener('resize', () => {
        sendLogToServer("internal", `Window resized to ${window.innerWidth}x${window.innerHeight}px`);
    });
    window.addEventListener('orientationchange', () => {
        sendLogToServer("internal", `Orientation changed to ${screen.orientation.type}`);
    });
    window.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            sendLogToServer("internal", "Entered fullscreen mode");
        } else {
            sendLogToServer("internal", "Exited fullscreen mode");
        }
    });


    // url change event
    window.addEventListener('hashchange', () => {
        sendLogToServer("internal", `URL hash changed to ${location.hash}`);
    });
    window.addEventListener('popstate', () => {
        sendLogToServer("internal", `History state changed: ${JSON.stringify(history.state)}`);
    });



}





// #region copied from common/logger.js


/**
 * Stringifies a log message, handling circular references and formatting.
 * @param {any} log
 * @param {Set<any>} [seen]
 */
function stringifyLog(log, seen = new Set(), depth = 0) {
    const isServer = typeof window === "undefined";
    const stringify_limits = {
        string: isServer ? 100_000 : 1_000,
        object_keys: isServer ? 300 : 200,
        object_depth: isServer ? 10 : 3,
        array_items: isServer ? 2_000 : 100,
    }

    if (typeof log === "string") {
        if (log.length > stringify_limits.string) log = `${log.slice(0, stringify_limits.string)}... <truncated ${log.length - stringify_limits.string} characters>`;
        return log;
    }
    if (typeof log === "number" || typeof log === "boolean") {
        return String(log);
    }
    if (log === null) {
        return "null";
    }
    if (log === undefined) {
        return "undefined";
    }
    if (typeof log === "function") {
        return "<function>";
    }

    if (seen.has(log)) return "<circular>";

    if (Array.isArray(log)
        || log instanceof ArrayBuffer
        || log instanceof Uint8Array
        || log instanceof Float32Array
        || log instanceof Int32Array
        || log instanceof Uint32Array
        || log instanceof Uint16Array
        || log instanceof Uint8ClampedArray
        || log instanceof Int16Array
        || log instanceof Int8Array
        || log instanceof BigInt64Array
        || log instanceof BigUint64Array
        || log instanceof Float64Array
    ) {
        seen.add(log);
        return stringifyArray(log);
    }
    if (typeof log === "object") {

        if (depth > stringify_limits.object_depth) {
            return "<object too deep>";
        }

        seen.add(log);

        if (log instanceof Error) {
            return `<Error: ${log.message}\nStack: ${log.stack}>`;
        }

        const keys = Object.keys(log);
        let res = "{";
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            let value = log[key];
            if (i >= stringify_limits.object_keys) {
                res += `, ... <truncated ${keys.length - i} keys>`;
                break;
            }

            if (typeof value === "number") {
                // clamp precision for numbers if it has decimal places
                if (value % 1 !== 0) {
                    value = Number(value.toFixed(4));
                }
            }
            let str = stringifyLog(value, seen, depth + 1);
            if (typeof value === "object") {
                if (Array.isArray(value)) {
                    str = `[${str}]`;
                }
            }
            else if (typeof value === "string") {
                str = `"${str}"`;
            }
            if (i > 0) res += ", ";
            res += `"${key}":${str}`;
        }
        res += "}";
        return res;
        // let entries = Object.entries(log).map(([key, value], index) => {
        //     if (index > stringify_limits.object_keys) return `"${key}": <truncated>`;
        //     return `"${key}": ${stringifyLog(value, seen, depth + 1)}`;
        // });
        // return `{ ${entries.join(", ")} }`;
    }

    return String(log);

    function stringifyArray(arr) {
        let res = "";
        for (let i = 0; i < arr.length; i++) {
            let entry = arr[i];
            if (res && i > 0) res += ", ";
            if (i > stringify_limits.array_items) {
                res += "<truncated " + (arr.length - i) + ">";
                break;
            }
            res += stringifyLog(entry, seen, depth + 1);
        }
        return res;
    }
}

