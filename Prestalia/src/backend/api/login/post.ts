import {Context, error, hasProps, Http2Context} from "../../core";
import {DatabaseSync} from "node:sqlite";
import {cookieToJSON, verifyJWT} from "../../utils/functions";
import login from "../../controllers/login/post";

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
            email = urlSearchParams.get("email") ?? "",
            password = urlSearchParams.get("password") ?? "";

          login(email, password, db).then((result) => {
            if (result.ok && result.token)
              return context.respond(303, {
                end: true,
                headers: {
                  "location": to ?? "/",
                  "set-cookie": `token=${result.token}; Path=/; Secure; HttpOnly; SameSite=Strict;`,
                },
              });
            else if (!result.ok && result.status)
              return context.respond(result.status, {end: true});
            else return context.respond(500, {end: true});
          });

          return;
        }
        case "application/json": {
          try {
            const json = JSON.parse(data);

            if (!hasProps(json, {email: "string", password: "string"}))
              return context.respond(400, {end: true});

            const email = json.email,
              password = json.password;

            login(email, password, db).then((result) => {
              if (result.ok && result.token) {
                const data = JSON.stringify({token: result.token});

                return context
                  .respond(200, {
                    headers: {
                      "content-type": "application/json",
                      "content-length": Buffer.byteLength(data),
                    },
                  })
                  .end(data);
              } else if (!result.ok && result.status)
                return context.respond(result.status, {end: true});
              else return context.respond(500, {end: true});
            });

            return;
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
