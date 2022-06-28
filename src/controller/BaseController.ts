import { ServerResponse } from "../Types";
import * as express from "express";
import { ILogger } from "adv-log";
import { IUrlService } from "../service/IUrlService";
import { Inject, Injectable } from "adv-ioc";

export interface ViewOptions {
    model?: any;
    layout?: string|false;
    viewBag?: any;
    request?: express.Request;
}

export function Method(target: any, propertyKey: string) {
    if (target.__controllerMethods == null) {
        target.__controllerMethods = [];
    }
    target.__controllerMethods.push(propertyKey);
}

export class BaseController extends Injectable {
    
    protected baseName: string;
    protected viewDirectory: string;
    protected layout: string;
    @Inject protected request: express.Request;
    @Inject protected response: express.Response;
    @Inject protected urlService: IUrlService;
    @Inject protected logger: ILogger;
    
    constructor() {
        super();
        const name = this.constructor.name.replace("Controller", "");
        this.baseName = name[0].toLowerCase() + name.substring(1);
        this.viewDirectory = this.baseName;
    }
    
    render(view: string, model?: any): Promise<ServerResponse> {
        return this.renderTemplate(view, {model: model});
    }
    
    async renderTemplate(view: string, options: ViewOptions): Promise<ServerResponse> {
        view = view.startsWith("/") ? view.substring(1) : this.viewDirectory + "/" + view;
        if (options.layout == null) {
            options.layout = this.layout;
        }
        if (options.viewBag == null) {
            options.viewBag = {};
        }
        options.request = this.request;
        this.fillViewBag(options.viewBag);
        return {view: view, model: options};
    }
    
    protected async fillViewBag(_viewBag: {[key: string]: unknown}) {
    }
    
    /**
    * Returns params from query string
    */
    get query(): qs.ParsedQs {
        return this.request.query;
    }
    
    /**
    * Returns params from post
    */
    get post(): {[key: string]: unknown} {
        return this.request.body;
    }
    
    /**
    * Returns params from routing, for example :id
    */
    get params(): {[key: string]: unknown} {
        return this.request.params;
    }
    
    redirect(url: string): ServerResponse {
        this.response.redirect(this.urlService.getUrl(url));
        return {completed: true};
    }
    
    redirectDirect(url: string): ServerResponse {
        this.response.redirect(url);
        return {completed: true};
    }
    
    json(data: any) {
        return {status: 200, contentType: "application/json", body: JSON.stringify(data)};
    }
    
    text(text: string) {
        return {status: 200, body: text};
    }
    
    forbidden() {
        return {status: 403, body: "403 Forbidden"};
    }
    
    notFound() {
        return {status: 404, body: "404 Not Found"};
    }
    
    badRequest() {
        return {status: 400, body: "400 Bad request"};
    }
    
    methodNotlAllowed() {
        return {status: 405, body: "405 Method not allowed"};
    }
    
    isPost() {
        return this.request.method == "POST";
    }
    
    isGet() {
        return this.request.method == "GET";
    }
}
