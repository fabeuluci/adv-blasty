import * as WebSocket from "ws";
import { ISessionHolder } from "../service/ISessionHolder";
import { RequestHolder } from "../service/RequestHolder";
import { RequestHttpEx } from "../Types";

export type WebSocketEx = WebSocket&{
    ex: WsEx;
}

export class WsEx {
    
    subscribtions: string[];
    
    constructor(
        public id: number,
        public webSocket: WebSocket,
        public request: RequestHttpEx,
        public isAlive: boolean
    ) {
        this.subscribtions = [];
    }
    
    get userId() {
        const sessionHolder = this.request.ioc.resolve<ISessionHolder>("sessionHolder");
        return sessionHolder.getUserId();
    }
    
    get sessionId() {
        const sessionHolder = this.request.ioc.resolve<ISessionHolder>("sessionHolder");
        return sessionHolder.sessionId;
    }
    
    get ip() {
        const requestHolder = this.request.ioc.resolve<RequestHolder>("requestHolder");
        return requestHolder.getIpAddress();
    }
    
    logout() {
        const sessionHolder = this.request.ioc.resolve<ISessionHolder>("sessionHolder");
        sessionHolder.clean();
    }
    
    subscribe(channel: string) {
        if (!this.subscribtions.includes(channel)) {
            this.subscribtions.push(channel);
        }
    }
    
    unsubscribe(channel: string) {
        const index = this.subscribtions.indexOf(channel);
        if (index != -1) {
            this.subscribtions.splice(index, 1);
        }
    }
    
    notifyRaw(channel: string, data: string) {
        if (!this.subscribtions.includes(channel)) {
            return;
        }
        this.webSocket.send(data);
    }
    
    notify(channel: string, data: unknown) {
        return this.notifyRaw(channel, WsEx.buildJsonRpcNotificationStr(channel, data));
    }
    
    static buildJsonRpcNotification(channel: string, data: unknown) {
        return {
            jsonrpc: "2.0",
            method: channel,
            params: data
        };
    }
    
    static buildJsonRpcNotificationStr(channel: string, data: unknown) {
        return JSON.stringify(WsEx.buildJsonRpcNotification(channel, data));
    }
}
