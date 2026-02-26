import {
  Context,
  hasProps,
  resolveAPIRequest,
  resolveRessourceRequest,
  SUPPORTED_METHODS,
  workingDirPath,
} from "@server/core";
import config from "../../config";
import {join} from "path";
import {
  Argon2Algorithm,
  Argon2Parameters,
  argon2Sync,
  randomBytes,
} from "crypto";

export async function handleRequest(
  context: Context,
  pageParams: any[],
  apiParams: any[],
): Promise<any> {
  try {
    if (!context.hostname)
      return context
        .respond(400, {headers: {"content-type": "text/plain"}})
        .end("Bad Request");

    const hostname = context.hostname;

    if (config.forceDomainUsage && hostname !== config.domain)
      return context.respond(404, {end: true});

    const path = context.path,
      method = context.method;

    if (!method || !path) return context.respond(500, {end: true});

    if (!SUPPORTED_METHODS.includes(method))
      return context.respond(501, {end: true});

    // Dossier /api du site
    if (path.startsWith("/api"))
      resolveAPIRequest(
        join(workingDirPath, "dist"),
        context,
        path,
        method,
        apiParams,
      );
    // Dossier /public ou /pages du site
    else
      resolveRessourceRequest(
        {
          dynamicPages: join(workingDirPath, "dist", "pages"),
          errorPages: join(workingDirPath, "errors"),
          staticPages: join(workingDirPath, "public"),
        },
        context,
        path,
        method,
        pageParams,
      );
  } catch (error) {
    return context.respond(400, {end: true});
  }
}

export function cookieToJSON(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.trim().split("=");

    if (key) {
      acc[key] = value ? decodeURIComponent(value) : "";
    }

    return acc;
  }, {});
}

export function hashPassword(
  password: string,
  parameters: Omit<Argon2Parameters, "message" | "nonce" | "secret">,
  options?: {
    nonce?: Argon2Parameters["nonce"];
    algorithm?: Argon2Algorithm;
    secret?: Argon2Parameters["secret"];
    onlyHash?: boolean;
  },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const nonce = options?.nonce ?? randomBytes(16),
      algorithm = options?.algorithm ?? "argon2id";

    try {
      const hash = argon2Sync(algorithm, {
        ...parameters,
        nonce,
        message: password,
        secret: options?.secret,
      }).toString("hex");

      resolve(
        options?.onlyHash
          ? hash
          : `algo=${algorithm}$nonce=${nonce.toString("hex")}$${Object.entries(
              parameters,
            )
              .map(([k, v]) => `${k}=${v}$`)
              .join("")}hash=${hash}`,
      );
    } catch (error) {
      reject(error);
    }
  });
}

export function verifyPassword(
  hash: string,
  password: string,
  secret?: Argon2Parameters["secret"],
): Promise<boolean> {
  const params = Object.fromEntries(hash.split("$").map((v) => v.split("=")));

  return new Promise((resolve, reject) => {
    if (
      !hasProps(params, {
        hash: "string",
        algo: "string",
        nonce: "string",
        parallelism: "unknown",
        tagLength: "unknown",
        memory: "unknown",
        passes: "unknown",
      })
    )
      return reject(new Error("Le hash a des paramètres manquants"));

    params.parallelism = parseInt(`${params.parallelism}`);
    params.tagLength = parseInt(`${params.tagLength}`);
    params.memory = parseInt(`${params.memory}`);
    params.passes = parseInt(`${params.passes}`);

    if (
      !hasProps(params, {
        parallelism: "number",
        tagLength: "number",
        memory: "number",
        passes: "number",
      })
    )
      return reject(
        new Error(
          "Échec de la conversion en nombre des paramètres parallelism, tagLength, memory et passes",
        ),
      );

    if (isNaN(params.parallelism))
      return reject(
        new TypeError("Le paramètre parallelism doit être de type number"),
      );
    if (isNaN(params.tagLength))
      return reject(
        new TypeError("Le paramètre tagLength doit être de type number"),
      );
    if (isNaN(params.memory))
      return reject(
        new TypeError("Le paramètre memory doit être de type number"),
      );
    if (isNaN(params.passes))
      return reject(
        new TypeError("Le paramètre passes doit être de type number"),
      );

    if (
      params.algo !== "argon2d" &&
      params.algo !== "argon2i" &&
      params.algo !== "argon2id"
    )
      return reject(new Error("Algorithme invalide"));

    hashPassword(password, params, {
      secret,
      algorithm: params.algo,
      nonce: Buffer.from(params.nonce, "hex"),
      onlyHash: true,
    })
      .then((pwdHash) => resolve(pwdHash === params.hash))
      .catch((reason) => reject(reason));
  });
}
