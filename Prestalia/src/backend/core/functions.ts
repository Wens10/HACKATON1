import cluster from "cluster";
import {Types} from "./interfaces.js";
import {execSync} from "child_process";
import {promisify} from "util";
import {brotliCompress, gzip} from "zlib";
import {access, readdir, readFile, stat, unlink, writeFile} from "fs/promises";
import {basename, extname, join, parse} from "path";
import {
  COMPRESSED_FILE_EXTENSIONS,
  FILE_EXTENSIONS_TO_COMPRESS,
  MIME_TYPES,
  SUPPORTED_ENCODING,
  SUPPORTED_EXTNAMES,
  SUPPORTED_METHODS,
} from "./constants.js";
import {Context, SupportedEncoding, SupportedExtname} from "./types.js";
import {createServer} from "http";
import {createReadStream, existsSync, statSync} from "fs";
import {certChallengesDirPath} from "./paths.js";

const logId = `${cluster.isPrimary ? "Master" : "Worker"} | ${process.pid} \t|`,
  isValid: {[K in keyof Types]: (value: unknown) => value is Types[K]} = {
    array: (value): value is Types["array"] => Array.isArray(value),
    buffer: (value): value is Types["buffer"] =>
      Buffer.isBuffer(value) ||
      (hasProps(value, {type: "string", data: "number[]"}) &&
        value.type === "Buffer"),
    cert: (value): value is Types["cert"] =>
      hasProps(value, {cert: "buffer", key: "buffer"}),
    null: (value): value is Types["null"] => value === null,
    object: (value): value is Types["object"] =>
      typeof value === "object" && value !== null && !Array.isArray(value),
    site: (value): value is Types["site"] =>
      isValid.array(value) &&
      isValid.string(value[0]) &&
      (isValid.cert(value[1]) || isValid.null(value[1])),
    unknown: (_value): _value is Types["unknown"] => true,
    // Types par défaut avec typeof (sauf object)
    bigint: (value): value is Types["bigint"] => typeof value === "bigint",
    boolean: (value): value is Types["boolean"] => typeof value === "boolean",
    function: (value): value is Types["function"] =>
      typeof value === "function",
    number: (value): value is Types["number"] => typeof value === "number",
    string: (value): value is Types["string"] => typeof value === "string",
    symbol: (value): value is Types["symbol"] => typeof value === "symbol",
    undefined: (value): value is Types["undefined"] =>
      typeof value === "undefined",
  };

function output<L extends "INFO" | "WARN" | "ERROR">(
  level: L,
  message?: any,
  ...optionalParams: any[]
) {
  const args = [
    new Date().toISOString(),
    "|",
    level.padEnd(5, " "),
    "|",
    logId,
    message,
    ...optionalParams,
  ];

  console[level.toLowerCase() as Lowercase<L>](...args);
}

export function log(message?: any, ...optionalParams: any[]): void {
  output("INFO", message, ...optionalParams);
}

export function error(message?: any, ...optionalParams: any[]): void {
  output("ERROR", message, ...optionalParams);
}

export function warn(message?: any, ...optionalParams: any[]): void {
  output("WARN", message, ...optionalParams);
}

export function hasProps<
  O extends Record<string, keyof Types | `${keyof Types}[]`>,
>(
  obj: unknown,
  props: O,
): obj is {
  [K in keyof O]: O[K] extends `${infer T extends keyof Types}[]`
    ? Types[T][]
    : O[K] extends keyof Types
      ? Types[O[K]]
      : never;
} {
  if (!isValid.object(obj)) return false;

  for (const [key, rawType] of Object.entries(props)) {
    if (!(key in obj)) return false;

    const isArray = rawType.endsWith("[]"),
      type = rawType.replace(/\[\]$/, "") as keyof Types,
      value = obj[key];

    if (isArray) {
      if (!isValid.array(value)) return false;
      else if (!value.every((subValue: unknown) => isValid[type](subValue)))
        return false;

      if (type === "buffer")
        obj[key] = value.map((buffer) =>
          Buffer.isBuffer(buffer) ? buffer : Buffer.from((buffer as any).data),
        );

      continue;
    }

    if (!isValid[type](value)) return false;

    if (type === "buffer")
      obj[key] = Buffer.isBuffer(value)
        ? value
        : Buffer.from((value as any).data);
  }

  return true;
}

export function isCertExpiringSoon(
  path: string,
  {thresholdMs = 864000000 /* 10 jours */}: {thresholdMs?: number},
): boolean {
  try {
    const notAfterStr = /notAfter=(.+)/.exec(
      execSync(`openssl x509 -enddate -noout -in ${path}`, {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      }),
    )?.[1];

    return (
      !notAfterStr || new Date(notAfterStr).getTime() - Date.now() < thresholdMs
    );
  } catch (err) {
    error(`Erreur lors de la vérification du certificat (${path}) :`, err);

    return true;
  }
}

const brotliCompressAsync = promisify(brotliCompress),
  gzipAsync = promisify(gzip);

// Compresse récursivement les fichiers d'un dossier en fonctions de leurs extensions
export async function compressFiles(dirPath: string, fileExtentions: string[]) {
  try {
    for (const file of await readdir(dirPath)) {
      const filePath = `${dirPath}/${file}`,
        stats = await stat(filePath);

      if (stats.isDirectory()) await compressFiles(filePath, fileExtentions);
      else if (stats.isFile() && fileExtentions.includes(extname(file)))
        await compressFile(filePath);
    }
  } catch (err) {
    error(`Erreur sur le dossier ${dirPath}:`, err);
  }
}

// Compresse un fichier avec brotli et gzip
export async function compressFile(filePath: string) {
  try {
    const data = await readFile(filePath),
      [brotliResult, gzipResult] = await Promise.all([
        brotliCompressAsync(data),
        gzipAsync(data),
      ]);

    await Promise.all([
      writeFile(`${filePath}.br`, brotliResult),
      writeFile(`${filePath}.gz`, gzipResult),
    ]);
  } catch (err) {
    error(`Erreur sur le fichier ${filePath}:`, err);
  }
}

// Supprime les fichiers compressés dont le fichier d'origine n'existe plus et recompresse les fichiers compressés non à jour
export async function updateCompressedFiles(dirPath: string) {
  try {
    for (const file of await readdir(dirPath)) {
      const filePath = `${dirPath}/${file}`,
        stats = await stat(filePath),
        fileExtension = extname(file);

      if (stats.isDirectory()) await updateCompressedFiles(filePath);
      else if (
        stats.isFile() &&
        COMPRESSED_FILE_EXTENSIONS.includes(fileExtension)
      ) {
        try {
          if (
            Math.floor(
              (await stat(`${dirPath}/${basename(file, fileExtension)}`))
                .mtimeMs,
            ) > Math.floor(stats.mtimeMs)
          )
            await compressFile(filePath);
        } catch (err) {
          try {
            await unlink(filePath);
          } catch (err) {
            error(`Impossible de supprimer ${filePath}:`, err);
          }
        }
      }
    }
  } catch (err) {
    error(
      `Erreur lors de la mise à jour des fichiers compressé du dossier ${dirPath}:`,
      err,
    );
  }
}

// Supprime récursivement les fichiers compressés d'un dossier
export async function deleteCompressedFiles(dirPath: string) {
  try {
    for (const file of await readdir(dirPath)) {
      const filePath = `${dirPath}/${file}`,
        stats = await stat(filePath);

      if (stats.isDirectory()) deleteCompressedFiles(filePath);
      else if (
        stats.isFile() &&
        COMPRESSED_FILE_EXTENSIONS.includes(extname(file))
      )
        unlink(filePath).catch((reason) => {
          error(
            `Le fichier ${dirPath}/${file} n'a pas pu être supprimé:`,
            reason,
          );
        });
    }
  } catch (err) {
    error(
      `Erreur lors de la suppression des fichiers compressé du dossier ${dirPath}:`,
      err,
    );
  }
}

export function isSupportedExtname(
  extname: string,
): extname is SupportedExtname {
  return SUPPORTED_EXTNAMES.includes(extname as any);
}

export function isSupportedEncoding(
  encoding: string,
): encoding is SupportedEncoding {
  return SUPPORTED_ENCODING.includes(encoding as any);
}

// Prédicat de type pour filtrer les tuples [string, number] -> [SupportedEncoding, number]
export function isSupportedEncodingPair(
  pair: [string, number],
): pair is [SupportedEncoding, number] {
  return isSupportedEncoding(pair[0]);
}

// Choisit la meilleur option d'encodage en prenant en compte les préférences du client et du serveur
export function chooseEncoding(
  acceptEncodingHeader: string,
): SupportedEncoding | "*" | undefined {
  const encoding = acceptEncodingHeader
    .split(",")
    .map((v) => {
      const [enc, q] = v.trim().split(";q=");

      return [enc ?? "identity", parseFloat(q ?? "1")] satisfies [
        string,
        number,
      ];
    })
    .filter(isSupportedEncodingPair)
    .sort(
      ([encA, qA], [encB, qB]) =>
        qB - qA ||
        SUPPORTED_ENCODING.indexOf(encA) - SUPPORTED_ENCODING.indexOf(encB),
    )[0]?.[0];

  return encoding === "*" ? SUPPORTED_ENCODING[0] : encoding;
}

export function createHTTPServer(port: number) {
  createServer((req, res) => {
    const host = req.headers.host;

    if (!host)
      return res
        .writeHead(400, {"content-type": "text/plain"})
        .end("Bad Request");

    const {href, pathname} = new URL(`https://${host}${req.url ?? "/"}`);

    if (pathname.startsWith("/.well-known/acme-challenge/")) {
      const acmeFile = join(certChallengesDirPath, pathname);

      if (existsSync(acmeFile) && statSync(acmeFile).isFile()) {
        res.writeHead(200, {"Content-Type": "text/plain"});

        createReadStream(acmeFile)
          .on("error", (err) => {
            error(`Erreur lors de la lecture du fichier ${acmeFile}:`, err);

            if (!res.headersSent)
              res.writeHead(500).end("Erreur lors de la lecture du fichier");
          })
          .pipe(res);
      } else res.writeHead(404).end("Not Found");

      return;
    }

    return res
      .writeHead(301, {"location": href, "content-type": "text/plain"})
      .end(`Redirecting to ${href}`);
  }).listen(port, () => log("Serveur HTTP lancé !"));
}

export async function resolveAPIRequest(
  resourceDir: string,
  context: Context,
  path: string,
  method: string,
  params: any[],
) {
  const resourcePath = join(resourceDir, path),
    handlerPath = join(resourcePath, `${method.toLowerCase()}.js`);

  try {
    const defaultExport: unknown = require(handlerPath)?.default;

    if (typeof defaultExport !== "function") {
      error(
        `L'export par défaut du fichier ${handlerPath} n'est pas une fonction.`,
      );

      context.respond(500, {end: true});
    } else defaultExport(context, context.headers, ...params);
  } catch (err) {
    error(`Erreur lors du chargement du fichier ${handlerPath}:`, err);

    if (
      await access(resourcePath)
        .then(() => true)
        .catch(() => false)
    )
      try {
        const allowedMethods = (await readdir(resourcePath))
          .map((file) => parse(file).name.toUpperCase())
          .filter((method) => SUPPORTED_METHODS.includes(method));

        context.respond(405, {
          headers: {allow: allowedMethods.join(", ")},
          end: true,
        });
      } catch (error) {
        context.respond(500, {end: true});
      }
    else context.respond(404, {end: true});
  }
}

export function resolveResourceRequest(
  resourceDir:
    | string
    | {dynamicPages: string; staticPages: string; errorPages: string},
  context: Context,
  path: string,
  method: string,
  pageParams: any[],
  // eslint-disable-next-line no-unused-vars
  shouldSkipCompression?: (path: string) => boolean | Promise<boolean>,
) {
  const dirIsString = typeof resourceDir === "string",
    pagePath = join(
      dirIsString ? join(resourceDir, "/pages") : resourceDir.dynamicPages,
      `${path === "/" ? "/index" : extname(path) === ".html" ? path.slice(0, -5) : path}.js`,
    );

  context.respondWithDynamicFile(pagePath, method, {
    pageParams,
    // Dossier /public du site
    onError: async () => {
      const filePath = join(
          dirIsString ? join(resourceDir, "/public") : resourceDir.staticPages,
          extname(path) === ""
            ? `${path === "/" ? "/index" : path}.html`
            : path,
        ),
        fileExtname = extname(filePath),
        encoding = context.headers["accept-encoding"]
          ? chooseEncoding(context.headers["accept-encoding"])
          : undefined;

      context.respondWithFile(filePath, method, {
        compressionEncoding:
          (await shouldSkipCompression?.(filePath)) ||
          !FILE_EXTENSIONS_TO_COMPRESS.includes(fileExtname)
            ? undefined
            : encoding,
        mimeType: isSupportedExtname(fileExtname)
          ? MIME_TYPES[fileExtname]
          : undefined,
        onError: async (code) => {
          const errorPath = join(
            dirIsString ? join(resourceDir, "/errors") : resourceDir.errorPages,
            `${code}.html`,
          );

          context.respondWithFile(errorPath, method, {
            compressionEncoding: (await shouldSkipCompression?.(errorPath))
              ? undefined
              : encoding,
            mimeType: MIME_TYPES[".html"],
          });
        },
      });
    },
  });
}
