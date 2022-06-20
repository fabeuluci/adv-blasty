import { Logger } from "adv-log";
import { Inject } from "adv-ioc";
import { ConfigLoader } from "adv-config";
import { IConfigService, IConfigValues } from "./IConfigService";

export abstract class ConfigService implements IConfigService {
    
    @Inject protected logger: Logger;
    @Inject protected configLoader: ConfigLoader;
    
    abstract values: IConfigValues;
    
    loadConfigFromArgv() {
        this.values = this.configLoader.loadConfigFromArgv(this.values);
        this.finishConfigLoad();
        this.logger.debug("Current config", this.values);
    }
    
    protected abstract finishConfigLoad(): void;
}
