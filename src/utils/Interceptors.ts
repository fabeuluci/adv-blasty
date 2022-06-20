import * as express from "express";
import * as ExpressFileUpload from "express-fileupload";
import * as fs from "fs";
import { Logger } from "adv-log";
import { UploadedFileEx } from "./FormFile";
import { IOC } from "adv-ioc";
import { CorsSettings } from "../service/IConfigService";
import * as http from "http";
import { applyResponse } from "./ExpressUtils";

export function jsonToBuffer(options?: {maxPayload?: number}): express.RequestHandler {
    const maxPayload = options && options.maxPayload ? options.maxPayload : 1000 * 1000;
    return (req, res, next) => {
        if (req.headers["content-type"] === "application/json") {
            const chunks: Buffer[] = [];
            let stopped = false;
            let length = 0;
            req.on("data", chunk => {
                chunks.push(chunk);
                length += chunk.length;
                if (length > maxPayload) {
                    res.status(400).send(JSON.stringify({status: 400, message: "Payload too big"}));
                    stopped = true;
                    req.destroy();
                }
            });
            req.on("end", () => {
                if (stopped) {
                    return;
                }
                req.body = Buffer.concat(chunks);
                next();
            });
        }
        else {
            next();
        }
    }
}

export function fileUpload(options: {fileSizeLimit: number, storageTmpDir: string}): express.RequestHandler {
    const logger = Logger.create("FileUpload")
    const fileUploadCallback = ExpressFileUpload({
        limits: {
            fileSize: options.fileSizeLimit
        },
        abortOnLimit: true,
        useTempFiles: true,
        tempFileDir: options.storageTmpDir
    });
    return (req, res, next) => {
        res.on("finish", async () => {
            if (!req.files) {
                return;
            }
            for (const name in req.files) {
                const baseFile = req.files[name];
                const list = Array.isArray(baseFile) ? baseFile : [baseFile];
                for (const f of list) {
                    if ((<UploadedFileEx>f).used) {
                        continue;
                    }
                    try {
                        logger.debug("Removing tmp file ", f.tempFilePath)
                        await fs.promises.unlink(f.tempFilePath);
                    }
                    catch (e) {
                        logger.error("Error during clearing tmp file", e)
                    }
                }
            }
        });
        return fileUploadCallback(req, res, next);
    };
}

export function requestIOC(ioc: IOC): express.RequestHandler {
    return (req, res, next) => {
        const requestScopeIOC = ioc.create<IOC>("requestScopeIOC");
        requestScopeIOC.registerValue("request", req);
        requestScopeIOC.registerValue("response", res);
        req.ioc = requestScopeIOC;
        next();
    };
}

export type CorsResult = {result: "success"}|{result: "fail", reason: string}|{result: "cors", allowOrigin: string};

export function cors(config: CorsSettings): {checker: (request: http.IncomingMessage) => CorsResult, handler: express.RequestHandler} {
    const methodsRaw = config.methods || "GET,HEAD,PUT,PATCH,POST,DELETE";
    const methodsList = Array.isArray(methodsRaw) ? methodsRaw : methodsRaw.split(",").map(x => x.trim());
    const methodsStr = methodsList.join(",");
    const headersRaw = config.allowedHeaders || "Content-Type,Authorization,Content-Length,X-Requested-With";
    const headersList = Array.isArray(headersRaw) ? headersRaw : headersRaw.split(",").map(x => x.trim());
    const headersStr = headersList.join(",");
    const checker = (req: http.IncomingMessage): CorsResult => {
        const origin = req.headers.origin;
        if (!origin || origin == config.baseOrigin || (origin == "null" && req.headers["sec-fetch-site"] == "same-origin")) {
            return {result: "success"};
        }
        if (!config.enabled) {
            return {result: "fail", reason: "Disabled"};
        }
        const allowAll = config.origins.includes("*");
        if (!allowAll && !config.origins.includes(origin)) {
            return {result: "fail", reason: "Invalid origin"};
        }
        if (req.method !== "OPTIONS" && !methodsList.includes(<string>req.method)) {
            return {result: "fail", reason: "Invalid HTTP method"};
        }
        return {result: "cors", allowOrigin: allowAll ? "*" : origin};
    };
    return {
        checker: checker,
        handler: (req, res, next) => {
            const corsCheckResult = checker(req);
            if (corsCheckResult.result === "fail") {
                return applyResponse(res, {status: 403, body: "CORS fail: " + corsCheckResult.reason})
            }
            else if (corsCheckResult.result === "cors" || req.method === "OPTIONS") {
                res.header("Access-Control-Allow-Origin", corsCheckResult.result === "cors" ? corsCheckResult.allowOrigin : config.baseOrigin);
                if (methodsStr) {
                    res.header("Access-Control-Allow-Methods", methodsStr);
                }
                if (headersStr) {
                    res.header("Access-Control-Allow-Headers", headersStr);
                }
                if (config.credentials) {
                    res.header("Access-Control-Allow-Credentials", "true");
                }
            }
            if (req.method === "OPTIONS" && config.preflightContinue !== true) {
                return applyResponse(res, {status: config.optionsSuccessStatus || 204});
            }
            next();
        }
    };
}