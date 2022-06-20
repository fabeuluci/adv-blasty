import { UploadedFile } from "express-fileupload";
import { PromiseUtils } from "adv-promise";
import * as types from "../Types";

export type UploadedFileEx = UploadedFile&{used?: boolean};

export class FormFile implements types.file.File {
    
    constructor(private data: UploadedFile) {
    }
    
    get size() {
        return <types.file.FileSize>this.data.size;
    }
    
    get type() {
        return <types.file.ContentType>this.data.mimetype;
    }
    
    get name() {
        return <types.file.FileName>this.data.name;
    }
    
    get tempFilePath() {
        return this.data.tempFilePath;
    }
    
    async move(filePath: string): Promise<void> {
        await PromiseUtils.promisify(x => this.data.mv(filePath, x));
        (<UploadedFileEx>this.data).used = true;
    }
}