import { Inject } from "adv-ioc";
import * as WebSocket from "ws";
import { JsonRpcExpressServer } from "../api/JsonRpcServer";
import { WebSocketEx } from "../ws/WsEx";
import { IPRateLimiter } from "./IPRateLimiter";
import { RequestHolder } from "./RequestHolder";

export class JsonRpcWebsocketHandler {
    
    @Inject private requestHolder: RequestHolder;
    @Inject private iPRateLimiter: IPRateLimiter;
    @Inject private jsonRpcServer: JsonRpcExpressServer;
    @Inject private limitApi: boolean;
    @Inject private websocket: WebSocketEx;
    
    async go(data: WebSocket.Data) {
        if (this.limitApi && !this.iPRateLimiter.canPerformRequest(this.requestHolder.getIpAddress())) {
            const response = this.jsonRpcServer.processApiLimitRateExceededErrorToStr();
            this.websocket.send(response);
            return;
        }
        if (Buffer.isBuffer(data)) {
            data = data.toString("utf8");
        }
        if (typeof(data) != "string") {
            throw new Error("Invalid data type in websocket " + typeof(data));
        }
        // TODO ping session to refresh session life time
        const result = await this.jsonRpcServer.processStrToStr(data);
        this.websocket.send(result);
    }
}
