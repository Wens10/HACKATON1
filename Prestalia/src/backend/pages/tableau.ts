import {renderFile} from "ejs";
import {
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {hasProps} from "../core";
import {cookieToJSON, verifyJWT} from "../utils/functions";
import {PageHandler} from "../utils/types";
import {RowDataPacket} from "mysql2";

export default (async (context, db) => {
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) throw null;

  const payload = verifyJWT(cookies.token);

  if (payload === false || !hasProps(payload, {userId: "number"})) throw null;

  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT name, email, role FROM users WHERE id = ?",
    [payload.userId],
  );

  const user = rows[0];

  if (!user) throw null;

  const [favorites] = await db.execute<RowDataPacket[]>(
    `SELECT f.provider_id, u.name AS provider_name, p.id AS provider_id
     FROM favorites f
     JOIN providers p ON f.provider_id = p.id
     JOIN users u ON p.user_id = u.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [payload.userId],
  );

  const [reservations] = await db.execute<RowDataPacket[]>(
    `SELECT
       r.id,
       r.date,
       r.price,
       r.status,
       p.id   AS provider_id,
       u.name AS provider_name,
       c.name AS category_name
     FROM reservations r
     JOIN providers p ON r.provider = p.id
     JOIN users u ON p.user_id = u.id
     LEFT JOIN categories c ON p.category = c.id
     WHERE r.author = ?
     ORDER BY r.date DESC`,
    [payload.userId],
  );

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "tableau.ejs"),
    {user, reservations, favorites},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
