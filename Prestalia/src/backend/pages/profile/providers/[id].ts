import {renderFile} from "ejs";
import {
  CLEAR_TOKEN_COOKIE,
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../../../utils/constants";
import {join} from "path";
import {error, hasProps} from "../../../core";
import {cookieToJSON, verifyJWT} from "../../../utils/functions";
import {PageHandler} from "../../../utils/types";
import {RowDataPacket} from "mysql2";

export default (async (context, db, providerId) => {
  const data: Record<string, any> = {},
    cookies = cookieToJSON(context.headers.cookie);

  if (hasProps(cookies, {token: "string"})) {
    const payload = verifyJWT(cookies.token);

    if (!hasProps(payload, {userId: "number"})) {
      context.respond(307, {
        headers: {
          "location": `/profile/${providerId}`,
          "set-cookie": CLEAR_TOKEN_COOKIE,
        },
        end: true,
      });

      return null;
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT name, role FROM users WHERE id = ?",
      [payload.userId],
    );

    const user = rows[0];

    if (!user) {
      context.respond(307, {
        headers: {
          "location": `/profile/${providerId}`,
          "set-cookie": CLEAR_TOKEN_COOKIE,
        },
        end: true,
      });

      return null;
    }

    data["user"] = user;
  }

  try {
    const provider = (
      await db.execute<RowDataPacket[]>(
        `
        SELECT
          p.id,
          p.created_at,
          p.valided,
          p.tel,
          p.city,
          p.descr,
          p.exp,
          p.price,
          p.days,
          c.name as category_name,
          u.name,
          u.email
        FROM providers p
        LEFT JOIN categories c ON p.category = c.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE u.role = 'provider' AND p.id = ?
      `,
        [providerId],
      )
    )[0][0];

    if (!provider) {
      context.respond(404, {end: true});

      return null;
    }

    data["provider"] = provider;

    console.log("PROVIDER", provider);

    return renderFile(
      join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "profile/providers/[id].ejs"),
      data,
      {
        root: DEFAULT_EJS_COMPONENT_DIR,
      },
    );
  } catch (err) {
    error("Erreur lors de la récupération des prestataires", err);

    context.respond(500, {end: true});

    return null;
  }
}) satisfies PageHandler;
