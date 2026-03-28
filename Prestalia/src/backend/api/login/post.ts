import {Context, error, hasProps, Http2Context} from "../../core";
import {DatabaseSync} from "node:sqlite";
import {sign} from "jsonwebtoken";
import {cookieToJSON, verifyJWT, verifyPassword} from "../../utils/functions";

const jwtSecret = process.env["JWT_SECRET"];

if (!jwtSecret) throw new Error("Le secret JWT est manquant");

export default ((context, headers, db) => {
  let data = "";

  const cookies = cookieToJSON(headers.cookie),
    to = context.url?.searchParams.get("to");

  if (hasProps(cookies, {token: "string"})) {
    const payload = verifyJWT(cookies.token);

    try {
      if (
        hasProps(payload, {userId: "number"}) &&
        db.prepare("SELECT id FROM users WHERE id = ?").get(payload.userId)
      )
        return context.respond(303, {
          end: true,
          headers: {
            location: "/",
          },
        });
    } catch (err) {
      error(
        "Erreur lors de la récupération d'un utilisateur grâce à un id",
        err,
      );

      return context.respond(303, {
        end: true,
        headers: {
          "location": to ?? "/auth#login",
          "set-cookie":
            "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
        },
      });
    }
  }

  const acceptPostHeader =
      "application/x-www-form-urlencoded, application/json",
    contentTypeHeader = context.headers["content-type"];

  if (!contentTypeHeader)
    return context.respond(415, {
      end: true,
      headers: {
        "accept-post": acceptPostHeader,
      },
    });

  const [mediaType, ...params] = contentTypeHeader.split(/; */),
    charset = params
      .find((param) => param.includes("charset="))
      ?.slice(8)
      .toLowerCase();

  if (charset && charset !== "utf8" && charset !== "utf-8")
    return context.respond(415, {
      end: true,
      headers: {
        "accept-post": acceptPostHeader,
      },
    });

  if (
    mediaType !== "application/x-www-form-urlencoded" &&
    mediaType !== "application/json"
  )
    return context.respond(415, {
      end: true,
      headers: {
        "accept-post": acceptPostHeader,
      },
    });

  return (context instanceof Http2Context ? context.stream : context.req)
    .on("error", (err) => error(err))
    .on("data", (chunk) => (data += chunk))
    .on("end", () => {
      switch (mediaType) {
        case "application/x-www-form-urlencoded": {
          const urlSearchParams = new URLSearchParams(data),
            email = urlSearchParams
              .get("email")
              ?.trim()
              .normalize("NFKC")
              .toLowerCase(),
            password = urlSearchParams.get("password")?.normalize("NFKC");

          if (!email || email === "") return context.respond(400, {end: true});
          if (!password || password === "")
            return context.respond(400, {end: true});

          try {
            const user = db
              .prepare("SELECT id, password FROM users WHERE email = ?")
              .get(email);

            if (!user) return context.respond(401, {end: true});

            if (!hasProps(user, {password: "string", id: "number"}))
              return context.respond(500, {end: true});

            return verifyPassword(
              user.password,
              password,
              process.env["ARGON2_SECRET"],
            )
              .then((isEqual) => {
                if (!isEqual) return context.respond(401, {end: true});

                try {
                  const token = sign({userId: user.id}, jwtSecret, {
                    expiresIn: "1h",
                    algorithm: "HS512",
                  });

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
              })
              .catch((reason) => {
                error(reason);

                return context.respond(500, {end: true});
              });
          } catch (err) {
            error(err);

            return context.respond(500, {end: true});
          }
        }
        case "application/json": {
          try {
            const json = JSON.parse(data);

            if (!hasProps(json, {email: "string", password: "string"}))
              return context.respond(400, {end: true});

            const email = json.email.trim().normalize("NFKC").toLowerCase(),
              password = json.password.normalize("NFKC");

            if (!email || email === "")
              return context.respond(400, {end: true});
            if (!password || password === "")
              return context.respond(400, {end: true});

            try {
              const user = db
                .prepare("SELECT id, password FROM users WHERE email = ?")
                .get(email);

              if (!user) return context.respond(401, {end: true});

              if (!hasProps(user, {password: "string", id: "number"}))
                return context.respond(500, {end: true});

              return verifyPassword(
                user.password,
                password,
                process.env["ARGON2_SECRET"],
              )
                .then((isEqual) => {
                  if (!isEqual) return context.respond(401, {end: true});

                  try {
                    const token = sign({userId: user.id}, jwtSecret, {
                        expiresIn: "1h",
                        algorithm: "HS512",
                      }),
                      data = JSON.stringify({token});

                    return context
                      .respond(200, {
                        headers: {
                          "content-type": "application/json",
                          "content-length": Buffer.byteLength(data),
                        },
                      })
                      .end(data);
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
          } catch (err) {
            error("Erreur lors de la transformation des données en JSON", err);

            return context.respond(400, {end: true});
          }
        }
        default:
          return context.respond(415, {
            end: true,
            headers: {
              "accept-post": acceptPostHeader,
            },
          });
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
