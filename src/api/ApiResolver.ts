import { IOC } from "adv-ioc";
import { JsonRpcError } from "adv-json-rpc-server";

export interface MethodPointer {
    depName: string;
    method: string;
}

export class ApiResolver {
    
    private methods: {[method: string]: MethodPointer};
    
    constructor() {
        this.methods = {};
    }
    
    register(methods: string[], depName: string, methodPrefix: string|null) {
        for (const method of methods) {
            this.methods[methodPrefix ? methodPrefix + "/" + method : method] = {method, depName};
        }
    }
    
    resolve(method: string): MethodPointer {
        if (!(method in this.methods)) {
            throw new JsonRpcError("METHOD_NOT_FOUND");
        }
        return this.methods[method];
    }
    
    static createApiResolver(apis: string|string[], typeProvider: IOC, prefixNames: boolean) {
        const apiResolver = new ApiResolver();
        const apiList = typeof(apis) == "string" ? [apis] : apis;
        for (const api of apiList) {
            const depName = api + "Api";
            const apiType = typeProvider.getType(depName);
            if (!apiType) {
                throw new Error("Cannot resolve '" + depName + "'");
            }
            const methods = apiType.prototype.__exportedMethods || [];
            apiResolver.register(methods, depName, prefixNames ? api : null);
        }
        return apiResolver;
    }
    
    createHandler(typeProvider: IOC) {
        return (method: string, params: unknown) => {
            const pointer = this.resolve(method);
            const api = typeProvider.create<{execute: (method: string, params: unknown) => unknown}>(pointer.depName);
            return api.execute(pointer.method, params);
        }
    }
}
