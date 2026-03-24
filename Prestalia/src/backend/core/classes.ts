import {createReadStream, stat} from "fs";
import {
  Http2ServerRequest,
  Http2ServerResponse,
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
  ServerHttp2Stream,
} from "http2";
import Stream from "stream";
import {error, hasProps} from ".";
import {SupportedEncoding} from "./types.js";
import {MIME_TYPES} from "./constants.js";

interface Context {
  readonly url: URL | undefined;
  readonly protocol: "http1" | "http2";
  readonly hostname: string | undefined;
  readonly method: string | undefined;
  readonly path: string | undefined;
  readonly headers: IncomingHttpHeaders;

  respond(
    // eslint-disable-next-line no-unused-vars
    status: number,
    // eslint-disable-next-line no-unused-vars
    options?: {headers?: OutgoingHttpHeaders; end?: boolean},
  ): this;

  // eslint-disable-next-line no-unused-vars
  toPipe<S extends Stream>(stream: S): S;

  // eslint-disable-next-line no-unused-vars
  end(data?: string | Uint8Array): this;

  respondWithFile(
    // eslint-disable-next-line no-unused-vars
    path: string,
    // eslint-disable-next-line no-unused-vars
    method: string,
    {
      // eslint-disable-next-line no-unused-vars
      mimeType,
      // eslint-disable-next-line no-unused-vars
      compressionEncoding,
      // eslint-disable-next-line no-unused-vars
      onError,
    }: {
      mimeType?: string | undefined;
      compressionEncoding?: SupportedEncoding | undefined;
      // eslint-disable-next-line no-unused-vars
      onError?: ((code: number) => void) | undefined;
    },
  ): void;

  respondWithDynamicFile(
    // eslint-disable-next-line no-unused-vars
    path: string,
    // eslint-disable-next-line no-unused-vars
    method: string,
    {
      // eslint-disable-next-line no-unused-vars
      onError,
    }: {
      pageParams?: any[];
      // eslint-disable-next-line no-unused-vars
      onError?: ((code: number) => void) | undefined;
    },
  ): void;
}

export class Http1Context implements Context {
  readonly protocol = "http1";

  constructor(
    public readonly req: Http2ServerRequest,
    public readonly res: Http2ServerResponse,
  ) {
    this.req = req;
    this.res = res;
  }

  get url() {
    const host = this.req.headers.host;

    if (host)
      try {
        return new URL(this.req.url, `https://${host}`);
      } catch (error) {
        return undefined;
      }
    else return undefined;
  }

  get hostname() {
    return this.url?.hostname;
  }

  get method() {
    return this.req.method.toUpperCase();
  }

  get path() {
    return this.url?.pathname;
  }

  get headers() {
    return this.req.headers;
  }

  respond(
    status: number,
    options?: {headers?: OutgoingHttpHeaders; end?: boolean},
  ): this {
    this.res.writeHead(status, options?.headers);

    if (options?.end) this.res.end();

    return this;
  }

  toPipe<S extends Stream>(stream: S): S {
    stream.pipe(this.res);

    return stream;
  }

  end(data?: string | Uint8Array): this {
    if (data) this.res.end(data);
    else this.res.end();

    return this;
  }

  private fail(
    code: number,
    headers: OutgoingHttpHeaders,
    // eslint-disable-next-line no-unused-vars
    onError?: (code: number) => void,
  ): false {
    if (onError)
      try {
        onError(code);
      } catch (err) {
        error("Erreur lors de l'envoi d'une réponse :", err);

        this.respond(code, {end: true, headers});
      }
    else this.respond(code, {end: true, headers});

    return false;
  }

  respondWithFile(
    path: string,
    method: string,
    {
      mimeType,
      compressionEncoding = "identity",
      onError,
    }: {
      mimeType?: string | undefined;
      compressionEncoding?: SupportedEncoding | undefined;
      // eslint-disable-next-line no-unused-vars
      onError?: ((code: number) => void) | undefined;
    },
  ): void {
    const finalPath =
      path +
      (compressionEncoding === "gzip"
        ? ".gz"
        : compressionEncoding === "br"
          ? ".br"
          : "");

    stat(finalPath, (err, stats) => {
      if (err)
        error(
          `Erreur lors de la récupération des stats du fichier ${finalPath}`,
          err,
        );

      if (err?.code === "ENOENT" || err?.code === "ENOTDIR")
        return this.fail(
          404,
          {},
          compressionEncoding && compressionEncoding !== "identity"
            ? () => this.respondWithFile(path, method, {mimeType, onError})
            : onError,
        );
      if (err?.code === "EACCES" || err?.code === "EPERM")
        return this.fail(403, {}, onError);
      if (err) return this.fail(500, {}, onError);
      if (!stats.isFile()) return this.fail(404, {}, onError);
      if (method !== "GET" && method !== "HEAD")
        return this.fail(405, {allow: "GET, HEAD"}, onError);
      if (!mimeType) return this.fail(415, {}, onError);

      this.respond(200, {
        headers: {
          "content-type": mimeType,
          "content-length": stats.size,
          "content-encoding": compressionEncoding,
          "last-modified": stats.mtime.toUTCString(),
        },
        end: method === "HEAD",
      });

      if (method === "GET")
        this.toPipe(createReadStream(finalPath)).on("error", (err) => {
          error(`Erreur lors de la lecture du fichier ${finalPath}:`, err);

          return this.res.destroy(err);
        });

      return;
    });
  }

  async respondWithDynamicFile(
    path: string,
    method: string,
    {
      pageParams = [],
      onError,
    }: {
      pageParams?: any[];
      // eslint-disable-next-line no-unused-vars
      onError?: ((code: number) => void) | undefined;
    },
  ): Promise<void> {
    try {
      const defaultExport: unknown = require(path)?.default;

      if (typeof defaultExport !== "function") {
        error(`L'export par défaut du fichier ${path} n'est pas une fonction.`);

        this.respond(500, {end: true});
      } else {
        const page = defaultExport(this, ...pageParams);

        if (
          page !== null &&
          typeof page !== "string" &&
          !(page instanceof Promise)
        ) {
          error(
            `La fonction du fichier ${path} doit renvoyer une string, null, ou une promise retournant une de ces valeurs.`,
          );

          this.respond(500, {end: true});
        } else {
          const data: unknown = page instanceof Promise ? await page : page;

          if (data === null) return;

          if (typeof data === "string") {
            if (method !== "GET" && method !== "HEAD")
              this.fail(405, {allow: "GET, HEAD"}, onError);
            else {
              this.respond(200, {
                headers: {
                  "content-type": MIME_TYPES[".html"],
                  "content-length": data.length,
                },
                end: method === "HEAD",
              });

              if (method === "GET") this.end(data);
            }
          } else {
            error(
              `La fonction du fichier ${path} doit renvoyer une string, null, ou une promise retournant une de ces valeurs.`,
            );
            this.respond(500, {end: true});
          }
        }
      }
    } catch (err) {
      if (!hasProps(err, {code: "string"}) || err.code !== "MODULE_NOT_FOUND")
        error("Erreur lors du chargement d'une page dynamique :", err);

      this.fail(500, {}, onError);
    }
  }
}

export class Http2Context implements Context {
  readonly protocol = "http2";

  constructor(
    public readonly stream: ServerHttp2Stream,
    public readonly headers: IncomingHttpHeaders,
  ) {
    this.stream = stream;
    this.headers = headers;
  }

  get url() {
    const host = this.headers[":authority"],
      path = this.headers[":path"];

    if (host && path)
      try {
        return new URL(path, `https://${host}`);
      } catch (error) {
        return undefined;
      }
    else return undefined;
  }

  get hostname() {
    return this.url?.hostname;
  }

  get method() {
    return this.headers[":method"]?.toUpperCase();
  }

  get path() {
    return this.url?.pathname;
  }

  respond(
    status: number,
    options?: {headers?: OutgoingHttpHeaders; end?: boolean},
  ): this {
    this.stream.respond(
      {...options?.headers, ":status": status},
      {endStream: options?.end},
    );

    return this;
  }

  toPipe<S extends Stream>(stream: S): S {
    stream.pipe(this.stream);

    return stream;
  }

  end(data?: string | Uint8Array): this {
    if (data) this.stream.end(data);
    else this.stream.end();

    return this;
  }

  private fail(
    code: number,
    headers: OutgoingHttpHeaders,
    // eslint-disable-next-line no-unused-vars
    onError?: (code: number) => void,
  ): false {
    if (onError)
      try {
        onError?.(code);

        return false;
      } catch (err) {
        error("Erreur lors de l'envoi d'une réponse avec onError:", err);
      }

    if (!this.stream.headersSent) {
      try {
        this.respond(code, {end: true, headers});
      } catch (err) {
        error("Erreur lors de l'envoi d'une réponse avec respond:", err);

        try {
          this.stream.close();
        } catch (err) {
          error("Erreur lors de la fermeture d'un stream :", err);
        }
      }

      return false;
    }

    try {
      this.stream.close();
    } catch (err) {
      error("Erreur lors de la fermeture d'un stream :", err);
    }

    return false;
  }

  respondWithFile(
    path: string,
    method: string,
    {
      mimeType,
      compressionEncoding,
      onError,
    }: {
      mimeType?: string | undefined;
      compressionEncoding?: SupportedEncoding | undefined;
      // eslint-disable-next-line no-unused-vars
      onError?: ((code: number) => void) | undefined;
    },
  ) {
    const finalPath =
      path +
      (compressionEncoding === "gzip"
        ? ".gz"
        : compressionEncoding === "br"
          ? ".br"
          : "");

    this.stream.respondWithFile(
      finalPath,
      {
        "content-type": mimeType,
        "content-encoding": compressionEncoding,
      },
      {
        statCheck: (stats, headers) => {
          headers["last-modified"] = stats.mtime.toUTCString();
          headers["content-length"] = stats.size;

          if (!stats.isFile()) return this.fail(404, {}, onError);
          if (method !== "GET" && method !== "HEAD")
            return this.fail(405, {allow: "GET, HEAD"}, onError);
          if (!mimeType) return this.fail(415, {}, onError);

          if (method === "HEAD") {
            this.respond(200, {headers, end: true});

            return false;
          }

          return true;
        },
        onError: (err) => {
          error(`Erreur lors de l'envoi du fichier ${finalPath}`, err);

          if (err.code === "ENOENT" || err.code === "ENOTDIR")
            return this.fail(
              404,
              {},
              compressionEncoding && compressionEncoding !== "identity"
                ? () =>
                    this.respondWithFile(path, method, {
                      mimeType,
                      onError,
                    })
                : onError,
            );
          else if (err.code === "EACCES" || err.code === "EPERM")
            return this.fail(403, {}, onError);
          else return this.fail(500, {}, onError);
        },
      },
    );
  }

  async respondWithDynamicFile(
    path: string,
    method: string,
    {
      pageParams = [],
      onError,
    }: {
      pageParams?: any[];
      // eslint-disable-next-line no-unused-vars
      onError?: ((code: number) => void) | undefined;
    },
  ): Promise<void> {
    try {
      const defaultExport: unknown = require(path)?.default;

      if (typeof defaultExport !== "function") {
        error(`L'export par défaut du fichier ${path} n'est pas une fonction.`);

        this.respond(500, {end: true});
      } else {
        const page = defaultExport(this, ...pageParams);

        if (
          page !== null &&
          typeof page !== "string" &&
          !(page instanceof Promise)
        ) {
          error(
            `La fonction du fichier ${path} doit renvoyer une string, null, ou une promise retournant une de ces valeurs.`,
          );

          this.respond(500, {end: true});
        } else {
          const data: unknown = page instanceof Promise ? await page : page;

          if (data === null) return;

          if (typeof data === "string") {
            if (method !== "GET" && method !== "HEAD")
              this.fail(405, {allow: "GET, HEAD"}, onError);
            else {
              this.respond(200, {
                headers: {
                  "content-type": MIME_TYPES[".html"],
                  "content-length": data.length,
                },
                end: method === "HEAD",
              });

              if (method === "GET") this.end(data);
            }
          } else {
            error(
              `La fonction du fichier ${path} doit renvoyer une string, null, ou une promise retournant une de ces valeurs.`,
            );
            this.respond(500, {end: true});
          }
        }
      }
    } catch (err) {
      if (!hasProps(err, {code: "string"}) || err.code !== "MODULE_NOT_FOUND")
        error("Erreur lors du chargement d'une page dynamique :", err);

      this.fail(500, {}, onError);
    }
  }
}
