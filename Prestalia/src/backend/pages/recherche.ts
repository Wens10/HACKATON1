import {renderFile} from "ejs";
import {
  CLEAR_TOKEN_COOKIE,
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {hasProps} from "../core";
import {cookieToJSON, verifyJWT} from "../utils/functions";
import {PageHandler} from "../utils/types";
import {RowDataPacket} from "mysql2";

export default (async (context, db) => {
  const data: Record<string, any> = {};

  const cookies = cookieToJSON(context.headers.cookie);

  if (hasProps(cookies, {token: "string"})) {
    const payload = verifyJWT(cookies.token);

    if (!hasProps(payload, {userId: "number"})) {
      context.respond(307, {
        headers: {
          "location": "/recherche",
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
          "location": "/recherche",
          "set-cookie": CLEAR_TOKEN_COOKIE,
        },
        end: true,
      });
      return null;
    }

    data["user"] = user;
  }

  const [categories] = await db.execute<RowDataPacket[]>(
    "SELECT id, name FROM categories ORDER BY name",
  );

  const q = context.url?.searchParams.get("q") ?? "";
  const catFilter = context.url?.searchParams.get("cat") ?? "";
  const maxPrice = context.url?.searchParams.get("price") ?? "";

  let query = `
    SELECT u.id, u.name, p.id AS provider_id, p.valided AS verified,
           p.city AS address, p.price, p.category, c.name AS category_name, p.descr
    FROM users u
    JOIN providers p ON p.user_id = u.id
    LEFT JOIN categories c ON p.category = c.id
    WHERE u.role = 'provider'
  `;
  const params: any[] = [];

  if (q) {
    query +=
      " AND (u.name LIKE ? OR c.name LIKE ? OR p.descr LIKE ? OR p.city LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (catFilter) {
    query += " AND p.category = ?";
    params.push(Number(catFilter));
  }
  if (maxPrice) {
    query += " AND p.price <= ?";
    params.push(Number(maxPrice));
  }

  const [providers] = await db.execute<RowDataPacket[]>(query, params);

  data["categories"] = categories;
  data["providers"] = providers;
  data["query"] = q;
  data["selectedCat"] = catFilter;
  data["selectedPrice"] = maxPrice ? Number(maxPrice) : null;

  return renderFile(join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "recherche.ejs"), data, {
    root: DEFAULT_EJS_COMPONENT_DIR,
  });
}) satisfies PageHandler;
