import {renderFile} from "ejs";
import {
  CLEAR_TOKEN_COOKIE,
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../../utils/constants";
import {join} from "path";
import {error, hasProps} from "../../core";
import {cookieToJSON, verifyJWT} from "../../utils/functions";
import {PageHandler} from "../../utils/types";
import {RowDataPacket} from "mysql2";

export default (async (context, db, providerId) => {
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) {
    context.respond(307, {
      headers: {location: `/auth?to=/reserver/${providerId}`},
      end: true,
    });
    return null;
  }

  const payload = verifyJWT(cookies.token);

  if (!hasProps(payload, {userId: "number"})) {
    context.respond(307, {
      headers: {
        "location": `/auth?to=/reserver/${providerId}`,
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
      end: true,
    });
    return null;
  }

  const [userRows] = await db.execute<RowDataPacket[]>(
    "SELECT name, role FROM users WHERE id = ?",
    [payload.userId],
  );

  const user = userRows[0];

  if (!user) {
    context.respond(307, {
      headers: {
        "location": `/auth?to=/reserver/${providerId}`,
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
      end: true,
    });
    return null;
  }

  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT p.id, p.price, p.days, p.city, c.name AS category_name, u.name
       FROM providers p
       LEFT JOIN categories c ON p.category = c.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [providerId],
    );

    const provider = rows[0];

    if (!provider) {
      context.respond(404, {end: true});
      return null;
    }

    const [resRows] = await db.execute<RowDataPacket[]>(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS res_date,
              DATE_FORMAT(date, '%H:%i')    AS res_time
       FROM reservations
       WHERE provider = ?
         AND status != 'rejected'
         AND DATE(date) >= CURDATE()`,
      [provider["id"]],
    );

    const bookedSlots = resRows.map((r) => ({
      date: r["res_date"] as string,
      time: r["res_time"] as string,
    }));

    return renderFile(
      join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "reserver/[id].ejs"),
      {user, provider, bookedSlots},
      {root: DEFAULT_EJS_COMPONENT_DIR},
    );
  } catch (err) {
    error(
      "Erreur lors de la récupération du prestataire pour réservation",
      err,
    );
    context.respond(500, {end: true});
    return null;
  }
}) satisfies PageHandler;
