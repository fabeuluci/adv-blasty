import { JsonRpcExpressServer } from "../api/JsonRpcServer";
import { IPRateLimiter } from "../service/IPRateLimiter";
import { RequestHolder } from "../service/RequestHolder";
import * as express from "express";
import { Try } from "adv-try";
import { FormFile } from "../utils/FormFile";
import { Inject, Injectable } from "adv-ioc";

export class JsonRpcHttpHandler extends Injectable {
    
    @Inject protected jsonRpcServer: JsonRpcExpressServer;
    @Inject protected iPRateLimiter: IPRateLimiter;
    @Inject protected requestHolder: RequestHolder;
    @Inject protected request: express.Request;
    @Inject protected limitApi: boolean;
    
    async go() {
        if (this.limitApi && !this.iPRateLimiter.canPerformRequest(this.requestHolder.getIpAddress())) {
            return this.jsonRpcServer.processApiLimitRateExceededErrorToServerResponse();
        }
        const contentType = this.request.headers["content-type"];
        if (contentType == "application/json") {
            return this.jsonRpcServer.processBodyToServerResponse(this.request.body);
        }
        else if (contentType && (contentType.startsWith("multipart/form-data;") || contentType == "application/x-www-form-urlencoded")) {
            if (!("jsonRpc" in this.request.body)) {
                return this.jsonRpcServer.processParseErrorToServerResponse("Misssing jsonRpc field");
            }
            const jsonRpcStr = this.request.body.jsonRpc;
            if (typeof(jsonRpcStr) != "string") {
                return this.jsonRpcServer.processParseErrorToServerResponse("Invalid jsonRpc field type");
            }
            const jsonRpcObj = Try.tryJsonParse(jsonRpcStr);
            if (!jsonRpcObj.success) {
                return this.jsonRpcServer.processParseErrorToServerResponse("Error during parsing json-rpc request");
            }
            if (this.request.files) {
                for (const name in this.request.files) {
                    if (!name.startsWith("jsonRpc.file.")) {
                        continue;
                    }
                    const baseFile = this.request.files[name];
                    const file = Array.isArray(baseFile) ? baseFile.map(x => new FormFile(x)) : new FormFile(baseFile);
                    this.setAtPath(jsonRpcObj.value, file, name.substr(13));
                }
            }
            return this.jsonRpcServer.processObjToServerResponse(jsonRpcObj.value);
        }
        return {
            status: 400,
            body: "Bad request. Unsupported content type"
        };
    }
    
    private setAtPath(obj: any, value: any, pathStr: string): void {
        const path = pathStr.split(".");
        let current = obj;
        for (let i = 0; i < path.length; i++) {
            const part = path[i];
            if (i == path.length - 1) {
                current[part] = value;
            }
            else {
                if (current[part] == null) {
                    current[part] = {};
                }
                current = current[part];
            }
        }
    }
}
