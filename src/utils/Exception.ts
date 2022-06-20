export class Exception extends Error {
    
    constructor(message: string, public readonly data: unknown, public readonly cause: unknown) {
        super(message);
    }
    
    override toString() {
        return super.toString() + (this.cause ? " - caused by " + this.cause : "");
    }
}
