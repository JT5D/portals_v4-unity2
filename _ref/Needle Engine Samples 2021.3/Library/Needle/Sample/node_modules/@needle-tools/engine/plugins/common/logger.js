import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, write } from "fs";

const filename_timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const debug = false;

// #region public api

/**
 * @typedef {"server" | "client" | "client-http"} ProcessType
 */

let originalConsoleLog = console.log;
let originalConsoleError = console.error;
let originalConsoleWarn = console.warn;
let originalConsoleInfo = console.info;
let originalConsoleDebug = console.debug;
let didPatch = false;
let unpatchFunction = null;

export function patchConsoleLogs() {
    if (didPatch) return unpatchFunction;
    didPatch = true;

    console.log = (...args) => {
        originalConsoleLog(...args);
        captureLogMessage("server", 'log', args, null);
    };
    console.error = (...args) => {
        originalConsoleError(...args);
        captureLogMessage("server", 'error', args, null);
    };
    console.warn = (...args) => {
        originalConsoleWarn(...args);
        captureLogMessage("server", 'warn', args, null);
    };
    console.info = (...args) => {
        originalConsoleInfo(...args);
        captureLogMessage("server", 'info', args, null);
    };
    console.debug = (...args) => {
        originalConsoleDebug(...args);
        captureLogMessage("server", 'debug', args, null);
    };

    // Restore original console methods
    unpatchFunction = () => {
        didPatch = false;
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        console.info = originalConsoleInfo;
        console.debug = originalConsoleDebug;
    }
    return unpatchFunction;
}


let isCapturing = false;
/** @type {Set<string>} */
const isCapturingLogMessage = new Set();

/** @type {Array<{ process: ProcessType, key: string, log:any, timestamp:number, connectionId: string | null }>} */
const queue = new Array();

/**
 * @param {ProcessType} process
 * @param {string} key
 * @param {any} log
 * @param {string | null} connectionId - Optional connection ID for client logs.
 * @param {number} [time] - Optional timestamp, defaults to current time.
 */
export function captureLogMessage(process, key, log, connectionId, time = Date.now()) {

    if (isCapturingLogMessage.has(log)) {
        return; // prevent circular logs
    }

    if (isCapturing) {
        queue.push({ process, key, log, timestamp: Date.now(), connectionId });
        return;
    }
    isCapturing = true;
    isCapturingLogMessage.add(log);

    try {
        let str = stringifyLog(log);
        if (str.trim().length > 0) {
            // if(process === "server") str = stripAnsiColors(str);
            const prefix = `${getTimestamp(time, true)}, ${process}${connectionId ? (`[${connectionId}]`) : ""}.${key}: `;
            const separator = "";
            const finalLog = indent(`${prefix}${separator}${removeEmptyLinesAtStart(str)}`, prefix.length, separator)
            writeToFile(process, finalLog, connectionId);
        }
    } finally {
        isCapturing = false;
        isCapturingLogMessage.delete(log);
    }

    let queued = queue.pop();
    if (queued) {
        captureLogMessage(queued.process, queued.key, queued.log, queued.connectionId, queued.timestamp);
    }
}


// #region stringify log



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

        if(log instanceof Error) {
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








// #region utility functions

/**
 * Returns the current timestamp in ISO format.
 * @param {number} [date] - Optional date to format, defaults to current date.
 */
function getTimestamp(date, timeOnly = false) {
    const now = date ? new Date(date) : new Date();
    if (timeOnly) {
        return now.toTimeString().split(' ')[0]; // HH:MM:SS
    }
    return now.toISOString();
}


/**
 * Indents a string by a specified length.
 * @param {string} str - The string to indent.
 * @param {number} length - The number of spaces to indent each line.
 * @returns {string} The indented string.
 */
function indent(str, length, separator = "") {
    const lines = str.split("\n");
    const prefixStr = " ".repeat(length) + separator;
    for (let i = 1; i < lines.length; i++) {
        let entry = lines[i].trim();
        if (entry.length === 0) continue; // skip empty lines
        // indent the line
        lines[i] = prefixStr + entry;
    }
    return lines.join("\n");
}

/**
 * Removes empty lines at the start of a string.
 * @param {string} str - The string to process.
 */
function removeEmptyLinesAtStart(str) {
    const lines = str.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length > 0) {
            lines[i] = line; // keep the first non-empty line
            return lines.slice(i).join("\n");
        }
    }
    return "";
}

/**
 * Strips ANSI color codes from a string.
 * @param {string} str - The string to process.
 */
function stripAnsiColors(str) {
    // This pattern catches most ANSI escape sequences
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}


// #region log to file

/** @type {Map<string, import("fs").WriteStream>} */
const filestreams = new Map();
const fileLogDirectory = "node_modules/.needle/logs";
// cleanup old log files
if (existsSync(fileLogDirectory)) {
    const files = readdirSync(fileLogDirectory);
    // sort by age and keep the last 10 files
    files.sort((a, b) => {
        const aStat = statSync(`${fileLogDirectory}/${a}`);
        const bStat = statSync(`${fileLogDirectory}/${b}`);
        return aStat.mtimeMs - bStat.mtimeMs;
    });
    // remove all but the last 30 files
    const filesToKeep = 30;
    for (let i = 0; i < files.length - filesToKeep; i++) {
        rmSync(`${fileLogDirectory}/${files[i]}`, { force: true });
    }
}

/**
 * Writes a log message to the file.
 * @param {ProcessType} process
 * @param {string} log
 * @param {string | null} connectionId - Optional connection ID for client logs.
 */
function writeToFile(process, log, connectionId) {
    const filename = `${process}.needle.log`; //connectionId && process === "client" ? `${process}-${connectionId}.needle.log` : `${process}.needle.log`;

    if (!filestreams.has(filename)) {
        if (!existsSync(fileLogDirectory)) {
            mkdirSync(fileLogDirectory, { recursive: true });
        }
        filestreams.set(filename, createWriteStream(`${fileLogDirectory}/${filename_timestamp}.${filename}`, { flags: 'a' }));
    }
    const writeStream = filestreams.get(filename);
    if (!writeStream) {
        if (debug) console.error(`No write stream for process: ${filename}`);
        return;
    }
    writeStream.write(log + '\n');
}



// #region process exit
function onExit() {
    filestreams.forEach((stream) => stream.end());
    filestreams.clear();
}
const events = ['SIGTERM', 'SIGINT', 'beforeExit', 'rejectionHandled', 'uncaughtException', 'exit'];
for (const event of events) {
    process.on(event, onExit);
}