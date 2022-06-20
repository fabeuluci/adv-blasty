import { IConfigService } from "../service/IConfigService";
import { TemplateCompiler, BaseHelper, TemplateFunc as LibTemplateFunc } from "adv-template";
import * as NodePath from "path";
import * as fs from "fs";
import { Inject } from "adv-ioc";

export type TemplateFunc<M = void, C = void, H extends BaseHelper = BaseHelper> = LibTemplateFunc<M, C, H, any>;
interface ViewCacheEntry {
    mtime: number, template: TemplateFunc<any, any, any>
}

export class ViewResolver {
    
    private viewCache: Map<string, ViewCacheEntry> = new Map();
    @Inject private configService: IConfigService;
    
    resolveViewPath(path: string): string {
        const tmplPath = path.startsWith("/") ? path : NodePath.resolve(this.configService.values.viewsBasePath, path);
        return tmplPath + (tmplPath.endsWith(".html") ? "" : ".html");
    }
    
    async resolveView(path: string): Promise<TemplateFunc<any, any, any>> {
        const viewPath = this.resolveViewPath(path);
        if (!this.viewCache.has(viewPath)) {
            return this.loadView(viewPath);
        }
        const entry = <ViewCacheEntry>this.viewCache.get(viewPath);
        if (this.configService.values.reloadViews) {
            const mtime = await this.getMtime(viewPath);
            const shouldReloadView = mtime != entry.mtime;
            if (shouldReloadView) {
                return this.loadViewWithMtime(viewPath, mtime);
            }
        }
        return entry.template;
    }
    
    private async loadView(viewPath: string) {
        return this.loadViewWithMtime(viewPath, await this.getMtime(viewPath));
    }
    
    private async loadViewWithMtime(viewPath: string, mtime: number) {
        const viewHtml = await fs.promises.readFile(viewPath, "utf8");
        const template = TemplateCompiler.compile(viewHtml);
        const entry: ViewCacheEntry = {
            mtime: mtime,
            template: template
        };
        this.viewCache.set(viewPath, entry);
        return entry.template;
    }
    
    private async getMtime(viewPath: string) {
        const stats = await fs.promises.stat(viewPath);
        return stats.mtime.getTime();
    }
}
