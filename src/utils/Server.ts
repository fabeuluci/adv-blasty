import { Inject, Injectable } from "adv-ioc";
import { Logger } from "adv-log";
import * as http from "http";

export class Server extends Injectable {
    
    @Inject private logger: Logger;
    
    constructor(
        public readonly server: http.Server,
        public readonly port: number,
        public readonly hostname: string,
        public readonly ssl: boolean
    ) {
        super();
    }
    
    listen() {
        return new Promise<void>((resolve, reject) => {
            this.server.listen(this.port, this.hostname, () => {
                this.logger.info("Server started " + (this.ssl ? "https" : "http") + "://" + this.hostname + ":" + this.port);
                resolve();
            });
            this.server.on("error", err => {
                this.logger.error("Server error", err);
                reject(err);
            });
        });
    }
}
