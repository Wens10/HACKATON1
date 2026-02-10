import { Http2ServerRequest, Http2ServerResponse, IncomingHttpHeaders, OutgoingHttpHeaders, ServerHttp2Stream } from "http2";
import Stream from "stream";
import { SupportedEncoding } from "./types.js";
interface Context {
    readonly url: URL | undefined;
    readonly protocol: "http1" | "http2";
    readonly hostname: string | undefined;
    readonly method: string | undefined;
    readonly path: string | undefined;
    readonly headers: IncomingHttpHeaders;
    respond(status: number, options?: {
        headers?: OutgoingHttpHeaders;
        end?: boolean;
    }): this;
    toPipe<S extends Stream>(stream: S): S;
    end(data?: string | Uint8Array): this;
    respondWithFile(path: string, method: string, { mimeType, compressionEncoding, onError, }: {
        mimeType?: string | undefined;
        compressionEncoding?: SupportedEncoding | undefined;
        onError?: ((code: number) => void) | undefined;
    }): void;
    respondWithDynamicFile(path: string, method: string, { onError, }: {
        pageParams?: any[];
        onError?: ((code: number) => void) | undefined;
    }): void;
}
export declare class Http1Context implements Context {
    readonly req: Http2ServerRequest;
    readonly res: Http2ServerResponse;
    readonly protocol = "http1";
    constructor(req: Http2ServerRequest, res: Http2ServerResponse);
    get url(): URL | undefined;
    get hostname(): string | undefined;
    get method(): string;
    get path(): string | undefined;
    get headers(): IncomingHttpHeaders;
    respond(status: number, options?: {
        headers?: OutgoingHttpHeaders;
        end?: boolean;
    }): this;
    toPipe<S extends Stream>(stream: S): S;
    end(data?: string | Uint8Array): this;
    private fail;
    respondWithFile(path: string, method: string, { mimeType, compressionEncoding, onError, }: {
        mimeType?: string | undefined;
        compressionEncoding?: SupportedEncoding | undefined;
        onError?: ((code: number) => void) | undefined;
    }): void;
    respondWithDynamicFile(path: string, method: string, { pageParams, onError, }: {
        pageParams?: any[];
        onError?: ((code: number) => void) | undefined;
    }): void;
}
export declare class Http2Context implements Context {
    readonly stream: ServerHttp2Stream;
    readonly headers: IncomingHttpHeaders;
    readonly protocol = "http2";
    constructor(stream: ServerHttp2Stream, headers: IncomingHttpHeaders);
    get url(): URL | undefined;
    get hostname(): string | undefined;
    get method(): string | undefined;
    get path(): string | undefined;
    respond(status: number, options?: {
        headers?: OutgoingHttpHeaders;
        end?: boolean;
    }): this;
    toPipe<S extends Stream>(stream: S): S;
    end(data?: string | Uint8Array): this;
    private fail;
    respondWithFile(path: string, method: string, { mimeType, compressionEncoding, onError, }: {
        mimeType?: string | undefined;
        compressionEncoding?: SupportedEncoding | undefined;
        onError?: ((code: number) => void) | undefined;
    }): void;
    respondWithDynamicFile(path: string, method: string, { pageParams, onError, }: {
        pageParams?: any[];
        onError?: ((code: number) => void) | undefined;
    }): void;
}
export {};
