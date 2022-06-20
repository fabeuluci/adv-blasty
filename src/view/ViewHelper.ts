import { RenderOptions, ViewRenderer } from "./ViewRenderer";
import { ViewResolver } from "./ViewResolver";
import { IUrlService } from "../service/IUrlService";
import { Helper } from "adv-template";
import { Inject, injectVariables } from "adv-ioc";

export class ViewHelper extends Helper {
    
    protected defaultLayout: string|false = false;
    
    @Inject protected viewResolver: ViewResolver;
    @Inject protected urlService: IUrlService;
    
    constructor() {
        super();
        injectVariables(this);
    }
    
    async render(options: RenderOptions): Promise<string> {
        return ViewRenderer.render(options, this.viewResolver, this, this.defaultLayout);
    }
    
    url(url: string): string {
        return this.urlService.getUrl(url);
    }
}
