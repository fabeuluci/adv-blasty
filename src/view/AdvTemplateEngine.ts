import { ViewOptions } from "../controller/BaseController";
import { Exception } from "../utils/Exception";
import { RequestViewHelper } from "./RequestViewHelper";

export function advTemplateEngine(): (path: string, options: object, callback: (e: any, rendered?: string) => void) => void {
    return (filePath, options, callback) => {
        (async () => {
            try {
                const opts = <ViewOptions>options;
                if (!opts.request) {
                    throw new Error("Missing request in template options");
                }
                const helper = opts.request.ioc.resolve<RequestViewHelper>("requestViewHelper");
                const str = await helper.render({...opts, template: filePath});
                callback(null, str);
            }
            catch (e) {
                callback(new Exception("Error during rendering view " + filePath, null, e));
            }
        })();
    };
}
