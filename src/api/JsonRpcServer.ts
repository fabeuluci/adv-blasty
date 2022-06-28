import { ServerResponse } from "../Types";
import { ILogger } from "adv-log";
import { ISessionHolder } from "../service/ISessionHolder";
import { Try } from "adv-try";
import { IJsonRpcServer, JsonRpcResponse, JsonRpcError } from "adv-json-rpc-server";
import { Inject } from "adv-ioc";
import { ErrorFactory } from "../service/ErrorFactory";

export class JsonRpcExpressServer {
    
    @Inject private logger: ILogger;
    @Inject private sessionHolder: ISessionHolder;
    @Inject private jsonRpcServer: IJsonRpcServer;
    @Inject private errorFactory: ErrorFactory;
    
    async processBodyToServerResponse(jRpc: unknown): Promise<ServerResponse> {
        const str = await this.processBodyToStr(jRpc);
        return {
            contentType: "application/json",
            body: Buffer.from(str, "utf8")
        };
    }
    
    async processObjToServerResponse(jRpc: unknown): Promise<ServerResponse> {
        const str = await this.processObjToStr(jRpc);
        return {
            contentType: "application/json",
            body: Buffer.from(str, "utf8")
        };
    }
    
    async processBodyToStr(jRpc: unknown): Promise<string> {
        if (typeof(jRpc) === "string") {
            return this.processStrToStr(jRpc);
        }
        if (Buffer.isBuffer(jRpc)) {
            return this.processStrToStr(jRpc.toString("utf8"));
        }
        return this.processObjToStr(jRpc);
    }
    
    async processStrToStr(jRpc: string): Promise<string> {
        const jObj = Try.tryJsonParse(jRpc);
        if (!jObj.success) {
            return this.processParseErrorToStr();
        }
        return this.processObjToStr(jObj.value);
    }
    
    async processObjToStr(jRpc: unknown): Promise<string> {
        const response = await this.processObj(jRpc);
        return JSON.stringify(response);
    }
    
    async processObj(jRpc: unknown): Promise<JsonRpcResponse> {
        const startTime = process.hrtime();
        const userId = this.sessionHolder.getUserId();
        const response = await this.jsonRpcServer.process(jRpc);
        const method = response.request.success ? response.request.value.method : "<unknown>";
        if (!response.success) {
            this.logger.error("Internal error during '" + method + "'", response.error);
        }
        this.log(method, startTime, userId || this.sessionHolder.getUserId() || "guest", response.success);
        return response.response;
    }
    
    log(method: string, startTime: [number, number], username: string, success: boolean): void {
        const endTime = process.hrtime();
        const elapsed = ((endTime[0] - startTime[0]) * 1000000000 + (endTime[1] - startTime[1])) / 1000000;
        this.logger.stat("api;" + method + ";" + username + ";" + success + ";" + elapsed);
    }
    
    processParseErrorToServerResponse(message?: string): ServerResponse {
        return {
            contentType: "application/json",
            body: Buffer.from(this.processParseErrorToStr(message), "utf8")
        };
    }
    
    processParseErrorToStr(message?: string): string {
        const startTime = process.hrtime();
        this.logger.error(message || "Parse error");
        this.log("<unknown>", startTime, this.sessionHolder.getUserId() || "guest", false);
        const response = this.jsonRpcServer.createJsonRpcError(null, new JsonRpcError("PARSE_ERROR", message));
        return JSON.stringify(response);
    }
    
    processApiLimitRateExceededErrorToServerResponse(message?: string): ServerResponse {
        return {
            contentType: "application/json",
            body: Buffer.from(this.processApiLimitRateExceededErrorToStr(message), "utf8")
        };
    }
    
    processApiLimitRateExceededErrorToStr(message?: string): string {
        const startTime = process.hrtime();
        this.logger.error(message || "Api rate limit exceeded");
        this.log("<unknown>", startTime, this.sessionHolder.getUserId() || "guest", false);
        const response = this.jsonRpcServer.createJsonRpcError(null, this.errorFactory.create("API_RATE_LIMIT_EXCEEDED", message));
        return JSON.stringify(response);
    }
}
