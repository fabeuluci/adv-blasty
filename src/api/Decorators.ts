export function ApiMethod(target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
    if (target.__exportedMethods == null) {
        target.__exportedMethods = []
    }
    target.__exportedMethods.push(propertyKey);
}