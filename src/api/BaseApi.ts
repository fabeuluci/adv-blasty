import * as Validator from "adv-validator";
import { ILogger } from "adv-log";
import { JsonRpcError } from "adv-json-rpc-server";
import { Inject, Injectable } from "adv-ioc";

export abstract class BaseApi extends Injectable {
    
    protected __exportedMethods: string[];
    protected abstract apiValidator: Validator.Types.PerNameValidator;
    
    @Inject protected logger: ILogger;
    
    async execute(method: string, params: unknown): Promise<any> {
        const m = (<any>this)[method];
        if (!(this.__exportedMethods || []).includes(method) || typeof(m) != "function") {
            throw new JsonRpcError("METHOD_NOT_FOUND");
        }
        this.validateAccess(method, params);
        this.validateParams(method, params);
        return m.call(this, params);
    }
    
    protected validateParams(method: string, params: unknown): void {
        this.apiValidator.validate(method, params);
    }
    
    protected validateAccess(_method: string, _params: any): void {
    }
}
