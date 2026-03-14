import {Context, error, hasProps, Http2Context} from "../../core";
import {DatabaseSync} from "node:sqlite";
import {sign, verify} from "jsonwebtoken";
import {cookieToJSON, verifyPassword} from "../../utils/functions";

const jwtSecret = process.env["JWT_SECRET"];

if (!jwtSecret) throw new Error("Le secret JWT est manquant");

export default ((context, headers, db) => {
  let data = "";

  const cookies = cookieToJSON(headers.cookie);

  if (hasProps(cookies, {token: "string"})) {
    try {
      const token = verify(cookies.token, jwtSecret, {algorithms: ["HS512"]});

      try {
        if (
          hasProps(token, {userId: "number"}) &&
          db.prepare("SELECT * FROM users WHERE id = ?").get(token.userId)
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
            "location": "/auth#login",
            "set-cookie":
              "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
          },
        });
      }
    } catch (error) {
      null;
    }
  }

  return (context instanceof Http2Context ? context.stream : context.req)
    .on("error", (err) => error(err))
    .on("data", (chunk) => (data += chunk))
    .on("end", () => {
      const params = new URLSearchParams(data),
        email = params.get("email")?.trim().normalize("NFKC").toLowerCase(),
        password = params.get("password")?.normalize("NFKC");

      if (!email || email === "") return context.respond(400, {end: true});
      if (!password || password === "")
        return context.respond(400, {end: true});

      try {
        const userExist = Boolean(
          db.prepare("SELECT * FROM users WHERE email = ?").get(email),
        );

        if (!userExist) return context.respond(400, {end: true});
      } catch (err) {
        error(err);

        return context.respond(500, {end: true});
      }

      try {
        const user = db
          .prepare("SELECT id, password FROM users WHERE email = ?")
          .get(email);

        if (!user) return context.respond(400, {end: true});

        if (!hasProps(user, {password: "string", id: "number"}))
          return context.respond(500, {end: true});

        return verifyPassword(
          user.password,
          password,
          process.env["ARGON2_SECRET"],
        )
          .then((isEqual) => {
            if (!isEqual) return context.respond(400, {end: true});

            try {
              const token = sign({userId: user.id}, jwtSecret, {
                expiresIn: "1h",
                algorithm: "HS512",
              });

              return context.respond(303, {
                end: true,
                headers: {
                  "location": "/",
                  "set-cookie": `token=${token}; Path=/; Secure; HttpOnly; SameSite=Strict;`,
                },
              });
            } catch (err) {
              error(err);

              return context.respond(500, {end: true});
            }
          })
          .catch((reason) => {
            error(reason);

            return context.respond(500, {end: true});
          });
      } catch (err) {
        error(err);

        return context.respond(500, {end: true});
      }
    });
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
) => void;
