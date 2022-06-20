import { ViewResolver, TemplateFunc } from "./ViewResolver";
import { BaseHelper } from "adv-template";

export interface RenderOptions {
    template: string|TemplateFunc;
    model?: any;
    context?: any;
    helper?: BaseHelper;
    layout?: string|false;
    viewBag?: any;
}

export class ViewRenderer {
    
    static async render(options: RenderOptions, viewResolver: ViewResolver, defaultHelper: BaseHelper, defaultLayout: string|false): Promise<string> {
        const template = await ViewRenderer.resolveTemplate(options.template, viewResolver);
        const viewBag = options.viewBag || {};
        let view = template(options.model, options.context, options.helper || defaultHelper, viewBag);
        let layout = options.viewBag.layout === false ? false : options.viewBag.layout || (options.layout === false ? false : options.layout || defaultLayout);
        while (true) {
            if (layout === false) {
                return view;
            }
            const layoutTemplate = await viewResolver.resolveView(layout);
            viewBag.layout = false;
            view = layoutTemplate({body: view}, options.context, options.helper || defaultHelper, viewBag);
            layout = viewBag.layout;
        }
    }
    
    private static async resolveTemplate(template: string|TemplateFunc, viewResolver: ViewResolver): Promise<TemplateFunc> {
        if (typeof(template) == "string") {
            return viewResolver.resolveView(template);
        }
        else if (typeof(template) == "function") {
            return template;
        }
        else {
            throw new Error("Invalid template");
        }
    }
}
