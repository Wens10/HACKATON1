import {
  Context,
  error,
  hasProps,
  Http2Context,
  MIME_TYPES,
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
import {EMAIL_REGEX} from "./constants";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "fs";
import {availableParallelism, totalmem} from "os";

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

/**
 * Basé sur :
 * - https://www.rfc-editor.org/rfc/rfc5322
 * - https://www.rfc-editor.org/rfc/rfc5234
 * - https://www.rfc-editor.org/rfc/rfc5321
 * - https://www.rfc-editor.org/rfc/rfc1035
 * - https://www.rfc-editor.org/rfc/rfc1123
 */
export function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;

  const index = email.lastIndexOf("@");

  if (index < 1 || index > 63) return false;

  const regex = EMAIL_REGEX,
    [, domain] = regex.exec(email) ?? [];

  if (!domain) return false;

  for (const label of domain.split(".")) if (label.length > 63) return false;

  return true;
}

export function isValidPassword(password: string): boolean {
  // Entropie: password.length * Math.log2(nb_chars);
  // Recommandation: entropie >= 80;
  //
  // password.length * Math.log2(nb_chars) >= 80 <=> password.length >= 80 / Math.log2(nb_chars)
  // Avec 95 caractères: password.length >= 80 / Math.log2(95) <=> password.length >= 12.176827737059469;
  // On arrondi au supérieur: password.length >= ⌈12.176827737059469⌉ <=> password.length >= 13
  if (password.length < 13) return false; // minimum 13 caractères
  if (password.length > 64) return false; // maximum 64 caractères
  if (new Set(password).size < 8) return false; // minimum 8 caractères uniques

  return true;
}

export function isAdminExists(context: Context, db: DatabaseSync) {
  if (process.env["ADMIN_EXISTS"] === "1") return true;

  try {
    const adminExists = db
      .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      .get();

    if (adminExists) {
      process.env["ADMIN_EXISTS"] = "1";

      return true;
    }
  } catch (err) {
    error(err);
  }

  let data = "";

  switch (context.method) {
    case "GET":
      try {
        const file = readFileSync(join(workingDirPath, "admin/login.html"));

        context
          .respond(200, {
            headers: {
              "content-type": MIME_TYPES[".html"],
              "content-length": file.length,
            },
          })
          .end(file);
      } catch (err) {
        error(err);
      }
      break;
    case "HEAD":
      try {
        const file = readFileSync(join(workingDirPath, "admin/login.html"));

        context
          .respond(200, {
            headers: {
              "content-type": MIME_TYPES[".html"],
              "content-length": file.length,
            },
          })
          .end();
      } catch (err) {
        error(err);
      }
      break;
    case "POST":
      (context instanceof Http2Context ? context.stream : context.req)
        .on("error", (err) => error(err))
        .on("data", (chunk) => (data += chunk))
        .on("end", () => {
          const params = new URLSearchParams(data),
            defaultPassword = params.get("default-password"),
            name = params.get("name"),
            email = params.get("email")?.trim().normalize("NFKC").toLowerCase(),
            password = params.get("password")?.normalize("NFKC");

          // Mot de passe par défaut
          if (!defaultPassword || defaultPassword === "")
            return context
              .respond(400, {
                headers: {"content-type": "text/plain; charset=utf-8"},
              })
              .end("Le mot de passe par défaut ne peut pas être vide");

          if (
            defaultPassword !==
            process.env["ADMIN_DEFAULT_PASSWORD"]?.normalize("NFKC")
          )
            return context
              .respond(400, {
                headers: {"content-type": "text/plain; charset=utf-8"},
              })
              .end("Le mot de passe par défaut ne correspond pas");

          // Nom
          if (!name || name === "")
            return context
              .respond(400, {
                headers: {"content-type": "text/plain; charset=utf-8"},
              })
              .end("Le nom ne peut pas être vide");

          // Email
          if (!email || email === "")
            return context
              .respond(400, {
                headers: {"content-type": "text/plain; charset=utf-8"},
              })
              .end("L'email ne peut pas être vide");
          if (!isValidEmail(email))
            return context
              .respond(400, {
                headers: {"content-type": "text/plain; charset=utf-8"},
              })
              .end("L'email est invalide");

          // Mot de passe
          if (!password || password === "")
            return context
              .respond(400, {
                headers: {"content-type": "text/plain; charset=utf-8"},
              })
              .end("Le mot de passe ne peut pas être vide");

          if (!isValidPassword(password))
            return context
              .respond(400, {
                headers: {"content-type": "text/plain; charset=utf-8"},
              })
              .end("Le mot de passe est invalide");

          try {
            const userExist = Boolean(
              db.prepare("SELECT * FROM users WHERE email = ?").get(email),
            );

            if (userExist)
              return context
                .respond(400, {
                  headers: {"content-type": "text/plain; charset=utf-8"},
                })
                .end("Email déjà utilisé par un utilisateur");
          } catch (err) {
            error(err);

            return context
              .respond(500, {
                headers: {"content-type": "text/plain; charset=utf-8"},
              })
              .end(
                "Erreur interne lors de la vérification de l'utilisation de l'email, voir logs",
              );
          }

          return hashPassword(
            password,
            {
              parallelism: Math.min(availableParallelism(), 8),
              tagLength: 64,
              memory: Math.floor(Math.min(totalmem() * 0.05, 1 << 28) / 1024),
              passes: 3,
            },
            {secret: process.env["ARGON2_SECRET"]},
          )
            .then((hash) => {
              try {
                db.prepare(
                  "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
                ).run(name, email, hash);

                process.env["ADMIN_EXISTS"] = "1";

                return context.respond(303, {
                  headers: {location: "/"},
                  end: true,
                });
              } catch (err) {
                error(err);

                return context
                  .respond(500, {
                    headers: {"content-type": "text/plain; charset=utf-8"},
                  })
                  .end(
                    "Erreur interne lors de la création du compte, voir logs",
                  );
              }
            })
            .catch((reason) => {
              error(reason);

              return context
                .respond(500, {
                  headers: {"content-type": "text/plain; charset=utf-8"},
                })
                .end(
                  "Erreur interne lors du hashage du mot de passe, voir logs",
                );
            });
        });
      break;
    default:
      context.respond(405, {end: true, headers: {allow: "GET, POST"}});
      break;
  }

  return false;
}
