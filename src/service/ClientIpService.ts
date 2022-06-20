import { ClientIP, RequestLike } from "real-client-ip";
import * as types from "opq-types";
import { IConfigService } from "./IConfigService";

export class ClientIpService {
    
    private clientIp?: ClientIP;
    
    constructor(
        private configService: IConfigService
    ) {
    }
    
    getClientIp(req: RequestLike) {
        return <types.net.IPAddress>this.getClientIpResolver().getClientIP(req);
    }
    
    private getClientIpResolver() {
        if (this.clientIp == null) {
            this.clientIp = new ClientIP({
                allowedRemotes: this.configService.values.server.proxy.allowedRemotes,
                allowedHeaders: this.configService.values.server.proxy.allowedHeaders
            });
        }
        return this.clientIp;
    }
}
