import { IOC } from "adv-ioc";
import * as http from "http";

export type ServerResponseHeaders = {[name: string]: string}

export type ServerResponse = {completed: true}|{
    status?: number;
    contentType?: string;
    headers?: ServerResponseHeaders;
    body?: any;
    view?: string;
    model?: any;
}

export type SessionId = string&{__opq_framework_sessionId: never};

export type Credit = number&{__opq_framework_credit: never};

export type RequestHttpEx = http.IncomingMessage&{ioc: IOC};

export namespace file {
    
    export type FileName = string&{__opq_file_fileName: never};
    export type ContentType = string&{__opq_file_contentType: never};
    export type FileSize = number&{__opq_file_fileSize: never};
    
    export interface File {
        name: FileName;
        type: ContentType;
        size: FileSize;
    }
}

export namespace crypto {
    
    export type PlainPassword = string&{__opq_crypto_plainPassword: never};
    export type HashedPassword = string&{__opq_crypto_hashedPassword: never};
}
