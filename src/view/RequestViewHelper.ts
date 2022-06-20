import { ViewHelper } from "./ViewHelper";
import { IConfigService } from "../service/IConfigService";
import { Inject } from "adv-ioc";

export class RequestViewHelper extends ViewHelper {
    
    @Inject protected configService: IConfigService
    
    constructor() {
        super();
        this.defaultLayout = this.configService.values.defaultLayout;
    }
}
