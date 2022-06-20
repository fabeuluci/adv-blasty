import { Inject, Injectable, InjectNamed, IOC } from "adv-ioc";
import { Migration, MigrationConstructor, MigrationManager, MongoDbManager } from "adv-mongo";
import { ConfigService } from "./service/ConfigService";
import * as express from "express";
import * as ExpressSession from "express-session";
import MongoStore = require("connect-mongo");
import { Logger } from "adv-log";
import { fileUpload, jsonToBuffer, requestIOC, cors } from "./utils/Interceptors";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import { Server } from "./utils/Server";
import * as terminus from "@godaddy/terminus";
import * as net from "net";
import { WsManager } from "./ws/WsManager";
import { IUrlService } from "./service/IUrlService";
import { applyResponse, promisifyExpressHandler } from "./utils/ExpressUtils";
import { RequestHttpEx, ServerResponse } from "./Types";
import { advTemplateEngine } from "./view/AdvTemplateEngine";
import { RequestHolder } from "./service/RequestHolder";
import { WebSocket } from "ws";
import { ApiResolver } from "./api/ApiResolver";
import { JsonRpcHttpHandler } from "./service/JsonRpcHttpHandler";
import { JsonRpcWebsocketHandler } from "./service/JsonRpcWebsocketHandler";

export class App extends Injectable {
    
    @Inject protected ioc: IOC;
    @Inject protected logger: Logger;
    @InjectNamed("expressApp") protected app: express.Application;
    
    async init() {
        await this.loadConfig();
        await this.initDb();
        await this.makeMigrations();
        await this.prepareEnvironment();
        await this.prepareSessionParser();
        await this.setupViewEngine();
        await this.registerInterceptors();
        await this.registerRoutes();
        await this.prepareServers();
        await this.listen();
    }
    
    async loadConfig() {
        const configService = this.ioc.resolve<ConfigService>("configService");
        configService.loadConfigFromArgv();
    }
    
    async initDb() {
        const configService = this.ioc.resolve<ConfigService>("configService");
        this.ioc.registerValue("mongoDbManager", await MongoDbManager.init(configService.values.mongo, {}, {}, this.ioc.resolve<{[collectionName: string]: string;}>("dbIdProperties")));
    }
    
    async makeMigrations() {
        const migrationsClasses = this.ioc.resolve<MigrationConstructor[]>("migrationsClasses");
        const migrations: Migration[] = migrationsClasses.map(x => ({id: x.id, create: session => this.ioc.createEx(x, {session: session})}));
        await this.ioc.createEx(MigrationManager, {migrations}).go();
    }
    
    async prepareEnvironment() {
        const configService = this.ioc.resolve<ConfigService>("configService");
        this.ioc.resolve<express.Application>("rootExpressApp").use(configService.values.contextPath, this.app);
    }
    
    async prepareSessionParser() {
        const configService = this.ioc.resolve<ConfigService>("configService");
        const sessionParser = ExpressSession({
            secret: configService.values.sessionSecret,
            resave: false,
            saveUninitialized: false,
            rolling: true,
            store: MongoStore.create({mongoUrl: configService.values.mongo.url + "/" + configService.values.mongo.dbName})
        });
        this.ioc.registerValue("sessionParser", sessionParser);
    }
    
    async setupViewEngine() {
        const configService = this.ioc.resolve<ConfigService>("configService");
        this.app.engine("html", advTemplateEngine());
        this.app.set("view engine", "html");
        this.app.set("views", configService.values.viewsBasePath);
    }
    
    async registerInterceptors() {
        const configService = this.ioc.resolve<ConfigService>("configService");
        this.app.use(requestIOC(this.ioc));
        this.app.use(this.ioc.resolve<express.RequestHandler>("sessionParser"));
        this.app.use(jsonToBuffer({
            maxPayload: configService.values.maxJsonPayload
        }));
        this.app.use(express.urlencoded({
            extended: true
        }));
        this.app.use(fileUpload({
            fileSizeLimit: configService.values.fileSizeLimit,
            storageTmpDir: configService.values.storageTmpDir
        }));
        this.app.use(cors(configService.values.cors).handler);
    }
    
    async registerRoutes() {
        
    }
    
    async prepareServers() {
        const configService = this.ioc.resolve<ConfigService>("configService");
        const rootExpressApp = this.ioc.resolve<express.Application>("rootExpressApp");
        const servers: Server[] = [];
        if (configService.values.server.http.enabled) {
            const server = this.ioc.createEx(Server, {
                server: http.createServer(rootExpressApp),
                port: configService.values.server.http.port,
                hostname: configService.values.server.http.hostname,
                ssl: false
            });
            this.prepareServer(server);
            servers.push(server);
        }
        if (configService.values.server.https.enabled) {
            const privateKey = await fs.promises.readFile(configService.values.server.https.privKeyPath, "utf8");
            const certificate = await fs.promises.readFile(configService.values.server.https.certificatePath, "utf8");
            const server = this.ioc.createEx(Server, {
                server: https.createServer({key: privateKey, cert: certificate}, rootExpressApp),
                port: configService.values.server.https.port,
                hostname: configService.values.server.https.hostname,
                ssl: false
            });
            this.prepareServer(server);
            servers.push(server);
        }
        this.ioc.registerValue("servers", servers);
    }
    
    async prepareServer(server: Server) {
        const configService = this.ioc.resolve<ConfigService>("configService");
        terminus.createTerminus(server.server, {
            signals: ["SIGINT", "SIGTERM"],
            timeout: configService.values.shutdownTimeout,
            healthChecks: {
                [this.resolveUrlPath("/healthcheck")]: async () => {
                }
            },
            beforeShutdown: async () => {
                this.logger.info("Shuting down - waiting max " + configService.values.shutdownTimeout + "ms to finish requests...");
            },
            onSignal: async () => {
                await this.tryClose();
            },
            onShutdown: async () => {
                this.logger.info("Server gracefully shutdowned!");
            }
        });
        
        //WebSocket
        const wsManager = this.ioc.resolve<WsManager>("wsManager");
        const wss = new WebSocket.Server({noServer: true});
        const corsChecker = cors(configService.values.cors).checker;
        server.server.on("upgrade", (request, socket, head) => {
            (async () => {
                try {
                    const req = <express.Request>request;
                    const res = <express.Response><unknown>{};
                    await promisifyExpressHandler(requestIOC(this.ioc), req, res);
                    await promisifyExpressHandler(this.ioc.resolve<express.RequestHandler>("sessionParser"), req, res);
                    const corsCheckResult = corsChecker(req);
                    if (corsCheckResult.result == "fail") {
                        this.logger.info("[Websocket] CORS fail", req.ioc.resolve<RequestHolder>("requestHolder").getIpAddress());
                        wss.handleUpgrade(request, <net.Socket>socket, head, ws => {
                            ws.close(3000, "CORS Fail: " + corsCheckResult.reason);
                        });
                        return;
                    }
                    wsManager.onUpgrade(<RequestHttpEx>request, <net.Socket>socket, head);
                }
                catch (e) {
                    this.logger.error("Error on upgrade request", e);
                    socket.destroy();
                }
            })();
        });
    }
    
    async listen() {
        const servers = this.ioc.resolve<Server[]>("servers");
        for (const server of servers) {
            await server.listen();
        }
    }
    
    async tryClose() {
        this.logger.info("Closing db connections...");
        try {
            await this.ioc.resolve<MongoDbManager>("mongoDbManager").close();
        }
        catch (e) {
            this.logger.error("Error during closing mongo connection");
        }
    }
    
    resolveUrlPath(path: string): string {
        return this.ioc.resolve<IUrlService>("urlService").resolveUrlPath(path);
    }
    
    /**
     * Bind methods from given apis under given path (default under /api)
     */
    bindJsonRpcOverHttp(options: {path?: string, apis: string|string[], limitApi?: boolean, prefixApi?: boolean}) {
        const limitApi = options.limitApi !== false;
        const prefixApi = options.prefixApi !== false;
        const apiResolver = ApiResolver.createApiResolver(options.apis, this.ioc.create<IOC>("requestScopeIOC"), prefixApi);
        this.app.post(options.path || "/api", (request: express.Request, response: express.Response) => {
            return this.onWebRequest(request, response, "api", ioc => {
                return ioc.create<JsonRpcHttpHandler>("jsonRpcHttpHandler", {apiResolver, limitApi}).go();
            });
        });
    }
    
    /**
     * Bind methods from given apis under given path (default under *)
     */
    bindJsonRpcOverWebSocket(options: {path?: string, limitApi?: boolean, authorizer?: (request: http.IncomingMessage) => boolean, apis: string|string[]}) {
        const limitApi = options.limitApi !== false;
        const apiResolver = ApiResolver.createApiResolver(options.apis, this.ioc.create<IOC>("requestScopeIOC"), true);
        const wsManager = this.ioc.resolve<WsManager>("wsManager");
        wsManager.addHandlerEx({
            path: options.path || "*",
            authorizer: options.authorizer,
            onMessage: async (data, ws) => {
                ws.ex.request.ioc.create<JsonRpcWebsocketHandler>("jsonRpcWebsocketHandler", {apiResolver, limitApi}).go(data);
            }
        });
    }
    
    bindControllerMethod(path: string, controller: string, method: string, httpMethods?: string[]) {
        const httpMethodsList = httpMethods || ["GET", "POST"];
        this.app.all(path, (request, response, next) => {
            if (!httpMethodsList.includes(request.method)) {
                return next();
            }
            return this.onWebRequest(request, response, method + " method from " + controller + " controller", ioc => {
                const controllerInstance = ioc.create<any>(controller + "Controller");
                return controllerInstance[method]();
            });
        });
    }
    
    bindControllerMethods(path: string, controller: string, httpMethods?: string[]) {
        const ioc = this.ioc.create<IOC>("requestScopeIOC");
        const controllerType = ioc.getType(controller + "Controller");
        if (!controllerType) {
            throw new Error("Cannot resolve '" + controller + "Controller'");
        }
        const methods = controllerType.prototype.__controllerMethods || [];
        if (methods.includes("index")) {
            this.bindControllerMethod(path + "/", controller, "index", httpMethods);
        }
        for (const method of methods) {
            this.bindControllerMethod(path + "/" + method, controller, method, httpMethods);
        }
    }
    
    async onWebRequest(req: express.Request, res: express.Response, handlerName: string, func: (ioc: IOC) => ServerResponse|Promise<ServerResponse>) {
        try {
            const result = await func(req.ioc);
            applyResponse(res, result);
        }
        catch (e) {
            this.logger.error("Unexpected error during processing " + handlerName + " request", e);
            applyResponse(res, {
                status: 500,
                body: "500 Internal Server Error"
            });
        }
    }
}
