import * as express from "express";
import { IOC } from "adv-ioc";

declare global {
    namespace Express {
        // Inject additional properties on express.Request
        interface Request {
            /**
             * This request's IOC
             */
            ioc: IOC;
        }
    }
}
