import {Context, error, hasProps, Http2Context} from "../../core";
import {DatabaseSync} from "node:sqlite";
import {availableParallelism, totalmem} from "os";
import {sign} from "jsonwebtoken";
import {
  cookieToJSON,
  hashPassword,
  isValidEmail,
  isValidPassword,
  verfyJWT,
} from "../../utils/functions";

const jwtSecret = process.env["JWT_SECRET"];

if (!jwtSecret) throw new Error("Le secret JWT est manquant");

export default ((context, headers, db) => {
  let data = "";

  const cookies = cookieToJSON(headers.cookie);

  if (hasProps(cookies, {token: "string"})) {
    const payload = verfyJWT(cookies.token);

    try {
      if (
        hasProps(payload, {userId: "number"}) &&
        db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId)
      )
        return context.respond(303, {
          end: true,
          headers: {
            "location": "/",
            "set-cookie":
              "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
          },
        });
    } catch (err) {
      error("Erreur lors de la récupération d'un utilisateur grâce à un id");

      return context.respond(303, {
        end: true,
        headers: {
          "location": "/auth#signup",
          "set-cookie":
            "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
        },
      });
    }
  }

  return (context instanceof Http2Context ? context.stream : context.req)
    .on("error", (err) => error(err))
    .on("data", (chunk) => (data += chunk))
    .on("end", () => {
      const params = new URLSearchParams(data),
        name = params.get("name"),
        email = params.get("email")?.trim().normalize("NFKC").toLowerCase(),
        password = params.get("password")?.normalize("NFKC");

      if (!name || name === "") return context.respond(400, {end: true});
      if (!email || email === "") return context.respond(400, {end: true});
      if (!isValidEmail(email)) return context.respond(400, {end: true});
      if (!password || password === "")
        return context.respond(400, {end: true});
      if (!isValidPassword(password)) return context.respond(400, {end: true});

      try {
        const userExist = Boolean(
          db.prepare("SELECT * FROM users WHERE email = ?").get(email),
        );

        if (userExist) return context.respond(400, {end: true});
      } catch (err) {
        error(err);

        return context.respond(500, {end: true});
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
            const userId = db
              .prepare(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
              )
              .run(name, email, hash).lastInsertRowid;

            try {
              const token = sign({userId}, jwtSecret, {
                  expiresIn: "1h",
                  algorithm: "HS512",
                }),
                to = context.url?.searchParams.get("to");

              return context.respond(303, {
                end: true,
                headers: {
                  "location": to ?? "/",
                  "set-cookie": `token=${token}; Path=/; Secure; HttpOnly; SameSite=Strict;`,
                },
              });
            } catch (err) {
              error(err);

              return context.respond(500, {end: true});
            }
          } catch (err) {
            error(err);

            return context.respond(500, {end: true});
          }
        })
        .catch((reason) => {
          error(reason);

          return context.respond(500, {end: true});
        });
    });
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
) => void;
