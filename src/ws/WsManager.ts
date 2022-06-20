import * as WebSocket from "ws";
import { WebSocketEx, WsEx } from "./WsEx";
import { Logger } from "adv-log";
import * as url from "url";
import * as net from "net";
import * as http from "http";
import { RequestHttpEx } from "../Types";
import { WebsocketActionService } from "../service/WebsocketActionService";
import { Inject, Injectable, IOC } from "adv-ioc";
import { RequestHolder } from "../service/RequestHolder";

export interface WebSocketHandler {
    path: string;
    wss: WebSocket.Server;
    isAliveIntervalId: NodeJS.Timeout;
    onUpgrade: (request: RequestHttpEx, socket: net.Socket, head: Buffer) => Promise<void>|void;
}

export class WsManager extends Injectable {
    
    @Inject private websocketActionService: WebsocketActionService;
    @Inject private logger: Logger;
    private webSocketHandlers: WebSocketHandler[];
    private id: number;
    
    constructor() {
        super();
        this.webSocketHandlers = [];
        this.id = 0;
    }
    
    async onUpgrade(request: RequestHttpEx, socket: net.Socket, head: Buffer) {
        try {
            try {
                const pathname = new url.URL("http://fake" + request.url).pathname;
                for (const handler of this.webSocketHandlers) {
                    if (handler.path == "*" || handler.path == pathname) {
                        await handler.onUpgrade(request, socket, head);
                        return;
                    }
                }
            }
            catch (e) {
                this.logger.error("Error during upgrading webSocket", e);
            }
            // no handlers found or error occurs
            socket.destroy();
        }
        catch (e) {
            this.logger.error("Error during upgrading webSocket", e);
        }
    }
    
    nextId() {
        return this.id++;
    }
    
    notify(channel: string, data: unknown) {
        this.notifyRaw(channel, WsEx.buildJsonRpcNotificationStr(channel, data));
    }
    
    notifyRaw(channel: string, data: string) {
        for (const handler of this.webSocketHandlers) {
            for (const ws of handler.wss.clients) {
                try {
                    (<WebSocketEx>ws).ex.notifyRaw(channel, data);
                }
                catch (e) {
                    this.logger.error("Error during sending notify to webSocket", e);
                }
            }
        }
    }
    
    logoutBySessionId(sessionId: string) {
        for (const handler of this.webSocketHandlers) {
            for (const ws of handler.wss.clients) {
                if ((<WebSocketEx>ws).ex.sessionId == sessionId) {
                    (<WebSocketEx>ws).ex.logout();
                    ws.close();
                }
            }
        }
    }
    
    hasOpenSessions(userId: string) {
        for (const handler of this.webSocketHandlers) {
            for (const ws of handler.wss.clients) {
                const wsEx = (<WebSocketEx>ws).ex;
                if (wsEx.userId == userId) {
                    return true;
                }
            }
        }
        return false;
    }
    
    addHandler(handler: WebSocketHandler) {
        this.webSocketHandlers.push(handler);
    }
    
    addHandlerEx(handler: {path: string, onMessage: (data: WebSocket.Data, websocket: WebSocketEx) => unknown, authorizer?: (request: http.IncomingMessage) => boolean}) {
        const wss = new WebSocket.Server({noServer: true});
        wss.on("connection", (ws: WebSocketEx) => {
            this.websocketActionService.emit({type: "connect", websocket: ws});
            ws.on("pong", () => {
                ws.ex.isAlive = true;
                this.websocketActionService.emit({type: "ping", websocket: ws});
            });
            ws.on("message", async (data: WebSocket.Data) => {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                (async () => {
                    try {
                        ws.ex.isAlive = true;
                        this.websocketActionService.emit({type: "message", websocket: ws});
                        await handler.onMessage(data, ws);
                    }
                    catch (e) {
                        this.logger.error("[Websocket] Unexpected error during processing message", ws.ex.ip, ws.ex.id, e);
                    }
                })();
            });
            ws.on("close", () => {
                this.websocketActionService.emit({type: "close", websocket: ws});
            });
        });
        const intervalId = setInterval(() => {
            wss.clients.forEach((wsRaw: WebSocket) => {
                const ws = <WebSocketEx>wsRaw;
                if (ws.ex.isAlive) {
                    ws.ex.isAlive = false;
                    ws.ping();
                }
                else {
                    ws.terminate();
                    this.websocketActionService.emit({type: "close", websocket: ws});
                }
            });
        }, 10000);
        this.addHandler({
            path: handler.path,
            wss: wss,
            isAliveIntervalId: intervalId,
            onUpgrade: async (request, socket, head) => {
                const ip = request.ioc.resolve<RequestHolder>("requestHolder").getIpAddress();
                if (handler.authorizer) {
                    if (!handler.authorizer(request)) {
                        this.logger.info("[Websocket] Unauthorized connection", ip);
                        wss.handleUpgrade(request, socket, head, ws => {
                            ws.close(3000, "Unauthorized");
                        });
                        return;
                    }
                }
                wss.handleUpgrade(request, socket, head, ws => {
                    const id = this.nextId();
                    this.logger.info("[Websocket] Connected", ip, id);
                    (<WebSocketEx>ws).ex = new WsEx(id, ws, request, true);
                    request.ioc.registerValue("websocket", ws);
                    wss.emit("connection", ws, request);
                });
            }
        });
    }
}
