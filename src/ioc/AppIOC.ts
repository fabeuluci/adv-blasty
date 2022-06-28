import { IOC } from "adv-ioc";
import { Logger } from "adv-log";
import { ViewResolver } from "../view/ViewResolver";
import { MailViewHelper } from "../view/MailViewHelper";
import { ApiResolver } from "../api/ApiResolver";
import { WsManager } from "../ws/WsManager";
import { LockManager } from "adv-lock";
import { ConfigLoader } from "adv-config";
import { IPRateLimiter } from "../service/IPRateLimiter";
import * as express from "express";
import { WebsocketActionService } from "../service/WebsocketActionService";
import { ClientIpService } from "../service/ClientIpService";
import { SessionRepository } from "../service/SessionRepository";
import { PasswordService } from "../service/PasswordService";
import { SingletonJobService } from "../service/SingletonJobService";
import { ImageService } from "../service/ImageService";

export class AppIOC extends IOC {
    
    constructor(parent?: IOC) {
        super(parent);
        this.registerValue("ioc", this);
        this.registerValue("expressApp", express());
        this.registerValue("rootExpressApp", express());
        this.registerFactory("logger", x => Logger.create(x));
        this.register(ClientIpService);
        this.register(ConfigLoader);
        this.register(ViewResolver);
        this.register(ApiResolver);
        this.register(MailViewHelper);
        this.register(WsManager);
        this.register(IPRateLimiter);
        this.register(WebsocketActionService);
        this.register(SessionRepository);
        this.register(PasswordService);
        this.register(SingletonJobService);
        this.register(ImageService);
        this.registerValue("lockManager", LockManager.create());
    }
}
