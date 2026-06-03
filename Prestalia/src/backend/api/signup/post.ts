import {error, hasProps, Http2Context} from "../../core";
import {cookieToJSON, verifyJWT} from "../../utils/functions";
import signup from "../../controllers/signup/post";
import {APIHandler} from "../../utils/types";
import {RowDataPacket} from "mysql2";
import {CLEAR_TOKEN_COOKIE} from "../../utils/constants";

const jwtSecret = process.env["JWT_SECRET"];

if (!jwtSecret) throw new Error("Le secret JWT est manquant");

export default (async (context, headers, db) => {
  let data = "";

  const cookies = cookieToJSON(headers.cookie),
    to = context.url?.searchParams.get("to");

  if (hasProps(cookies, {token: "string"})) {
    const payload = verifyJWT(cookies.token);

    try {
      if (
        hasProps(payload, {userId: "number"}) &&
        (
          await db.execute<RowDataPacket[]>(
            "SELECT 1 FROM users WHERE id = ?",
            [payload.userId],
          )
        )[0][0]
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
          "location": to ?? "/auth#signup",
          "set-cookie": CLEAR_TOKEN_COOKIE,
        },
      });
    }
  }

  const acceptPostHeader = "application/x-www-form-urlencoded",
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

  if (mediaType !== "application/x-www-form-urlencoded")
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
      const params = new URLSearchParams(data),
        name = params.get("name") ?? "",
        email = params.get("email") ?? "",
        password = params.get("password") ?? "";

      signup(name, email, password, db).then((result) => {
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
    });
}) satisfies APIHandler;
