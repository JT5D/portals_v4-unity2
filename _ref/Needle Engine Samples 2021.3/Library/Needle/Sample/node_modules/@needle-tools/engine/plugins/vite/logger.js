import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { captureLogMessage, patchConsoleLogs } from '../common/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/**
 * write logs to local file
 * @param {import('../types/userconfig.js').userSettings} userSettings
 * @returns {import('vite').Plugin | null}
 */
export const needleLogger = (command, config, userSettings) => {

    if (userSettings?.disableLogging === true) {
        return null;
    }

    patchConsoleLogs();
    captureLogMessage("server", "info", "Vite started with command \"" + command + "\" in " + __dirname, null);

    return {
        name: "needle:logger",
        enforce: 'pre',
        configureServer(server) {
            logRequests(server);
        },
        configurePreviewServer(server) {
            logRequests(server);
        },
        transformIndexHtml: {
            order: 'pre',
            handler(html, ctx) {
                // inject client logger script during development
                if (command === 'serve') {
                    const file = path.join(__dirname, 'logger.client.js');
                    if (existsSync(file)) {
                        const scriptContent = readFileSync(file, 'utf8');
                        return [
                            {
                                tag: 'script',
                                attrs: {
                                    type: 'module',
                                },
                                children: scriptContent,
                                injectTo: 'head-prepend',
                            },
                        ];
                    }
                }
            },
        },
    }
}


/**
 * Logs HTTP requests to the console.
 * This function is used in the Vite server to log incoming HTTP requests.
 * @param {import('vite').PreviewServer | import('vite').ViteDevServer} server
 */
function logRequests(server, log_http_requests = false) {
    /**
     * Logs a message to the server console and captures it.
     * @type {Map<import("vite").WebSocket, {id:string}>}
     */
    const connectedClients = new Map();
    let index = 0;

    if ("ws" in server) {
        // Clent connections
        server.ws.on('connection', (socket, request) => {
            const clientId = String(index++);
            connectedClients.set(socket, { id: clientId });
            const ip = request.socket.remoteAddress || 'unknown';
            captureLogMessage("server", "connection", `New websocket connection established ${clientId} from ${ip}`, clientId);
            socket.on('close', () => {
                captureLogMessage("server", "connection", `Websocket connection closed ${clientId}`, clientId);
            });
        });
        // Client log messages via websocket
        server.ws.on('needle:client-log', async (data, client) => {
            if (!data || !data.level || !data.message) {
                console.warn("Received empty log data, ignoring");
                return;
            }
            const socket = client.socket;
            const info = connectedClients.get(socket);
            captureLogMessage("client", data.level, data.message, info ? info.id : null);
        });
    }
    // Log HTTP requests
    server.middlewares.use((req, res, next) => {
        if (log_http_requests) {
            captureLogMessage("client-http", "info", [req.method, req.url], null);
        }
        next();
    });
}