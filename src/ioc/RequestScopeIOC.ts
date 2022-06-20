import { IOC } from "adv-ioc";
import { RequestViewHelper } from "../view/RequestViewHelper";
import { JsonRpcExpressServer } from "../api/JsonRpcServer";
import { BufferEncoder, JsonRpcServer, JsonRpcServerWithEncoder } from "adv-json-rpc-server";
import { ApiResolver } from "../api/ApiResolver";
import { RequestHolder } from "../service/RequestHolder";
import { JsonRpcWebsocketHandler } from "../service/JsonRpcWebsocketHandler";
import { JsonRpcHttpHandler } from "../service/JsonRpcHttpHandler";

export class RequestScopeIOC extends IOC {
    
    constructor(parent?: IOC) {
        super(parent);
        this.register(JsonRpcServer);
        this.register(RequestHolder);
        this.register(RequestViewHelper);
        this.registerFactory("jsonRpcExpressServer", (_p, _pn, _n, props) => {
            if (!props || !("apiResolver" in props)) {
                throw new Error("Props are required when resolved jsonRpcExpressServer");
            }
            return this.createEx(JsonRpcExpressServer, {
                jsonRpcServer: this.createEx(JsonRpcServerWithEncoder, {
                    apiHandler: (props["apiResolver"] as ApiResolver).createHandler(this),
                    encoder: new BufferEncoder()
                })
            });
        });
        this.registerFactory("jsonRpcHttpHandler", (_p, _pn, _n, props) => {
            if (!props || !("apiResolver" in props) || !("limitApi" in props)) {
                throw new Error("Props are required when resolved jsonRpcExpressServer");
            }
            return this.createEx(JsonRpcHttpHandler, {
                jsonRpcServer: this.create<JsonRpcExpressServer>("jsonRpcExpressServer", {apiResolver: props["apiResolver"]}),
                limitApi: props["limitApi"] as boolean
            });
        });
        this.registerFactory("jsonRpcWebsocketHandler", (_p, _pn, _n, props) => {
            if (!props || !("apiResolver" in props) || !("limitApi" in props)) {
                throw new Error("Props are required when resolved jsonRpcExpressServer");
            }
            return this.createEx(JsonRpcWebsocketHandler, {
                jsonRpcServer: this.create<JsonRpcExpressServer>("jsonRpcExpressServer", {apiResolver: props["apiResolver"]}),
                limitApi: props["limitApi"] as boolean
            });
        });
    }
}
