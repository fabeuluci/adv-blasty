import * as http from "http";
import { Inject, Injectable } from "adv-ioc";
import { ClientIpService } from "./ClientIpService";

export class RequestHolder extends Injectable implements RequestHolder {
    
    @Inject private clientIpService: ClientIpService;
    
    constructor(
        private request: http.IncomingMessage
    ) {
        super();
    }
    
    getIpAddress() {
        return this.clientIpService.getClientIp(this.request);
    }
    
    getUserAgent(): string|undefined {
        return this.getHeader("user-agent");
    }
    
    getHeader(headerName: string): string|undefined {
        const value = this.request.headers[headerName.toLowerCase()];
        return Array.isArray(value) ? value[0] : value;
    }
}
