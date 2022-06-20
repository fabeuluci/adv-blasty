import * as crypto from "crypto";
import * as types from "../Types";
import { PromiseUtils } from "adv-promise";

export class PasswordService {
    
    hashPassword(password: types.crypto.PlainPassword, salt: Buffer): Promise<Buffer> {
        return PromiseUtils.promisify<Buffer>(x => crypto.pbkdf2(password, salt, 10000, 32, "sha256", x));
    }
    
    async encodePassword(password: types.crypto.PlainPassword): Promise<types.crypto.HashedPassword> {
        const salt = crypto.randomBytes(16);
        const hash = await this.hashPassword(password, salt);
        return <types.crypto.HashedPassword>("p|" + salt.toString("hex") + "|" + hash.toString("hex"));
    }
    
    async checkPassword(password: types.crypto.PlainPassword, hashed: types.crypto.HashedPassword): Promise<boolean> {
        const [type, salt, hash] = hashed.split("|");
        if (type != "p" || !salt || !hash) {
            throw new Error("Corrupted hashed password");
        }
        const h = await this.hashPassword(password, Buffer.from(salt, "hex"));
        return h.equals(Buffer.from(hash, "hex"))
    }
}
