import { MongoDbManager } from "adv-mongo";
import { SessionId } from "../Types";

export interface SessionDb {
    id: SessionId;
    expires: Date;
    session: {
        cookie: {[key: string]: any};
    };
}

export class SessionRepository {
    
    constructor(
        private mongoDbManager: MongoDbManager
    ) {
    }
    
    getSessionsRepo() {
        return this.mongoDbManager.getRepository<SessionId, SessionDb>("sessions");
    }
    
    async get(sessionId: SessionId) {
        const repo = await this.getSessionsRepo();
        return repo.get(sessionId);
    }
    
    async update(session: SessionDb) {
        const repo = await this.getSessionsRepo();
        await repo.update(session);
    }
    
    async delete(sessionId: SessionId) {
        const repo = await this.getSessionsRepo();
        await repo.delete(sessionId);
    }
}
