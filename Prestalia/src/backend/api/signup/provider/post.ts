import {error, hasProps} from "../../../core";
import busboy from "busboy";
import {cookieToJSON, verifyJWT} from "../../../utils/functions";
import signup from "../../../controllers/signup/provider/post";
import {APIHandler} from "../../../utils/types";
import {RowDataPacket} from "mysql2";
import {CLEAR_TOKEN_COOKIE} from "../../../utils/constants";

export default (async (context, headers, db) => {
  const cookies = cookieToJSON(headers.cookie);

  if (!hasProps(cookies, {token: "string"}))
    return context.respond(401, {end: true});

  const payload = verifyJWT(cookies.token);

  if (!hasProps(payload, {userId: "number"}))
    return context.respond(401, {
      end: true,
      headers: {
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
    });

  try {
    const userId = payload.userId,
      user = (
        await db.execute<RowDataPacket[]>(
          "SELECT id, role FROM users WHERE id = ?",
          [userId],
        )
      )[0][0];

    if (!user || !hasProps(user, {role: "string"}))
      return context.respond(401, {
        end: true,
        headers: {
          "set-cookie": CLEAR_TOKEN_COOKIE,
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
      if (info.filename) {
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
      } else stream.on("data", () => null).on("end", () => null);
    })
      .on("error", (err) => {
        console.error(err);

        return context.respond(500, {end: true});
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
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
    });
  }
}) satisfies APIHandler;
