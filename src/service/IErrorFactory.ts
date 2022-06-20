export interface IErrorFactory {
    createError(originalError: unknown, errorName: string): unknown;
}
