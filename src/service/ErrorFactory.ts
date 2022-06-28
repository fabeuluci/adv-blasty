export abstract class ErrorFactory {
    
    abstract create(errorName: string, data: unknown): unknown;
    
    createFromError(errorName: string, originalError: unknown) {
        const data = originalError ? (<{message: string}>originalError).message : "";
        return this.create(errorName, data);
    }
}
