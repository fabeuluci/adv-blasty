import * as express from "express";
import { ServerResponse } from "../Types";

export function promisifyExpressHandler(handler: express.RequestHandler, req: express.Request, res: express.Response) {
    return new Promise<void>((resolve, reject) => {
        try {
            handler(req, res, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        }
        catch (e) {
            reject(e);
        }
    });
}

export function applyResponse(res: express.Response, data: string|Buffer|ServerResponse) {
    if (data == null) {
        throw new Error("Empty response");
    }
    if (typeof(data) == "string" || data instanceof Buffer) {
        res.send(data);
    }
    else if (!("completed" in data)) {
        if (data.status) {
            res.status(data.status);
        }
        if (data.contentType) {
            res.contentType(data.contentType);
        }
        if (data.headers) {
            for (const name in data.headers) {
                res.set(name, data.headers[name]);
            }
        }
        if (data.view) {
            res.render(data.view, data.model);
        }
        else {
            res.send(data.body || "");
        }
    }
}
