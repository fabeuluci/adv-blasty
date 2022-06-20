import { ViewHelper } from "./ViewHelper";
import { IConfigService } from "../service/IConfigService";
import { Inject } from "adv-ioc";

export class MailViewHelper extends ViewHelper {
    
    @Inject protected configService: IConfigService
    
    constructor() {
        super();
        this.defaultLayout = this.configService.values.defaultMailLayout;
    }
}
