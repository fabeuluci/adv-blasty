import { MongoConfig } from "adv-mongo";
import * as types from "opq-types";
import { Credit } from "../Types";

export interface CorsSettings {
    enabled: boolean;
    baseOrigin: string;
    origins: string[];
    methods?: string|string[];
    allowedHeaders?: string|string[];
    credentials?: boolean;
    optionsSuccessStatus?: number;
    preflightContinue?: boolean;
}

export interface IConfigValues {
    server: {
        http: {
            enabled: boolean;
            hostname: string;
            port: number;
        };
        https: {
            enabled: boolean;
            hostname: string;
            port: number;
            privKeyPath: string;
            certificatePath: string;
        };
        proxy: {
            allowedRemotes: string | string[];
            allowedHeaders: (string | [string, {[key: string]: unknown;}])[];
        };
    };
    contextPath: string;
    cors: CorsSettings;
    shutdownTimeout: number;
    viewsBasePath: string;
    reloadViews: boolean;
    defaultLayout: string|false;
    defaultMailLayout: string|false;
    mongo: MongoConfig;
    sessionSecret: string;
    assetsDir: string;
    storageDir: string;
    storageTmpDir: string;
    storageModDir: string;
    storageYtTmpDir: string;
    fileSizeLimit: number;
    maxJsonPayload: number;
    mail: {
        from: string;
        host: string;
        port: number;
        secure: boolean;
        auth: boolean;
        user: string;
        pass: string;
        requireTLS: boolean;
        ignoreTLS: boolean;
        checkCert: boolean;
    };
    apiRateLimit: {
        banPeriod: types.time.Timespan;
        initialCredit: Credit;
        maxCredit: Credit;
        creditAddon: Credit;
        addonInterval: types.time.Timespan;
        requestCost: Credit;
        inactiveTime: types.time.Timespan;
    };
}

export interface IConfigService {
    values: IConfigValues;
}
