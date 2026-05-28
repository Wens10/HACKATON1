import {Context, error, hasProps} from "../../../core";
import {DatabaseSync} from "node:sqlite";
import busboy from "busboy";
import {cookieToJSON, verifyJWT} from "../../../utils/functions";
import signup from "../../../controllers/signup/provider/post";

export default ((context, headers, db) => {
  const cookies = cookieToJSON(headers.cookie);

  if (!hasProps(cookies, {token: "string"}))
    return context.respond(401, {end: true});

  const payload = verifyJWT(cookies.token);

  if (!hasProps(payload, {userId: "number"}))
    return context.respond(401, {
      end: true,
      headers: {
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
    });

  try {
    const userId = payload.userId,
      user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);

    if (!user || !hasProps(user, {role: "string"}))
      return context.respond(401, {
        end: true,
        headers: {
          "set-cookie":
            "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
        },
      });

    if (user.role.toLowerCase() === "provider")
      return context.respond(303, {
        end: true,
        headers: {
          location: "/tableau_presta",
        },
      });

    const bb = busboy({headers}),
      body: Record<
        string,
        number | string | {filename: string; data: Buffer<ArrayBuffer>}[]
      > = {};

    bb.on("file", (name, stream, info) => {
      const filename = Buffer.from(info.filename, "latin1").toString("utf8");

      let data = Buffer.from([]);

      body[name] ??= [];

      stream
        .on(
          "data",
          (chunk) => (data = Buffer.concat([data, Buffer.from(chunk)])),
        )
        .on("end", () => {
          if (Array.isArray(body[name])) body[name].push({filename, data});
        });
    })
      .on("field", (name, value) => (body[name] ??= value))
      .on("close", async () =>
        signup(body, userId, db).then((result) => {
          if (result.ok)
            return context.respond(303, {
              end: true,
              headers: {
                location: "/tableau_presta",
              },
            });
          else if (!result.ok && result.status)
            return context.respond(result.status, {end: true});
          else return context.respond(500, {end: true});
        }),
      );

    return (context.protocol === "http1" ? context.req : context.stream).pipe(
      bb,
    );
  } catch (err) {
    error("Erreur lors de la récupéaration d'un utilisateur par l'id", err);

    return context.respond(500, {
      end: true,
      headers: {
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
    });
  }
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
) => void;
