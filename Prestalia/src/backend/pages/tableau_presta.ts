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
    "SELECT name, role FROM users WHERE id = ?",
    [payload.userId],
  );

  const user = rows[0];

  if (!user) throw null;
  if (user["role"] !== "provider") throw null;

  // Récupérer l'id du provider
  const [providerRows] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM providers WHERE user_id = ?",
    [payload.userId],
  );

  const provider = providerRows[0];
  if (!provider) throw null;

  // Réservations avec infos client
  const [reservations] = await db.execute<RowDataPacket[]>(
    `SELECT
       r.id,
       r.date,
       r.price,
       r.status,
       u.name AS client_name
     FROM reservations r
     JOIN users u ON r.author = u.id
     WHERE r.provider = ?
     ORDER BY r.date ASC`,
    [provider["id"]],
  );

  // Stats agrégées
  const [statsRows] = await db.execute<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN MONTH(r.date) = MONTH(NOW()) AND YEAR(r.date) = YEAR(NOW()) THEN r.price ELSE 0 END) AS monthly_revenue,
       SUM(CASE WHEN r.date > NOW() THEN 1 ELSE 0 END) AS upcoming_count
     FROM reservations r
     WHERE r.provider = ?`,
    [provider["id"]],
  );

  const stats = statsRows[0];

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "tableau_presta.ejs"),
    {user, reservations, stats},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
