import { SessionId } from "../Types";

export interface ISessionHolder {
    sessionId: SessionId;
    getUserId(): string;
    clean(): void;
}
