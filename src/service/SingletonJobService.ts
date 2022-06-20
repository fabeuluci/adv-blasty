export class SingletonJobService {
    
    private promises: {[id: string]: Promise<void>} = {};
    
    async withPromise(id: string, func: () => Promise<void>) {
        if (id in this.promises) {
            return this.promises[id];
        }
        try {
            this.promises[id] = func();
            await this.promises[id];
        }
        finally {
            delete this.promises[id];
        }
    }
}
