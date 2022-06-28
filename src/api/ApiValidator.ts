import { Inject, Injectable } from "adv-ioc";
import * as Validator from "adv-validator";
import { ErrorFactory } from "../service/ErrorFactory";

export abstract class ApiValidator extends Injectable implements Validator.Types.PerNameValidator {
    
    protected checker: Validator.ValidatorChecker;
    protected builder: Validator.ValidatorBuilder;
    protected methods: {[key: string]: Validator.Types.Validator};
    
    @Inject protected errorFactory: ErrorFactory;
    
    constructor() {
        super();
        this.checker = new Validator.ValidatorChecker();
        this.builder = new Validator.ValidatorBuilder();
        this.methods = {};
    }
    
    registerMethod(method: string, validator: Validator.Types.Validator) {
        this.methods[method] = validator;
    }
    
    validate(method: string, data: any): void {
        const validator = this.methods[method];
        if (validator == null) {
            throw new Error("Cannot find validator for method '" + method + "'");
        }
        try {
            return this.checker.validateValue(data, validator);
        }
        catch (e) {
            const errorName = Validator.ValidatorException.getErrorNameFromException(e);
            throw this.errorFactory.createFromError(errorName, e);
        }
    }
}
