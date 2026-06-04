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
  let loggedUserId: number | null = null;

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

    loggedUserId = payload.userId;
    data["user"] = user;
  }

  const [categories] = await db.execute<RowDataPacket[]>(
    "SELECT id, name FROM categories ORDER BY name",
  );

  const q = context.url?.searchParams.get("q") ?? "";
  const catFilters =
    context.url?.searchParams.getAll("cat").map(Number).filter(Boolean) ?? [];
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

  if (loggedUserId !== null) {
    query += " AND u.id != ?";
    params.push(loggedUserId);
  }

  if (q) {
    query +=
      " AND (u.name LIKE ? OR c.name LIKE ? OR p.descr LIKE ? OR p.city LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (catFilters.length > 0) {
    query += ` AND p.category IN (${catFilters.map(() => "?").join(",")})`;
    params.push(...catFilters);
  }
  if (maxPrice) {
    query += " AND p.price <= ?";
    params.push(Number(maxPrice));
  }

  const [providers] = await db.execute<RowDataPacket[]>(query, params);

  // Récupérer les IDs favoris de l'utilisateur connecté
  if (loggedUserId !== null) {
    const [favRows] = await db.execute<RowDataPacket[]>(
      "SELECT provider_id FROM favorites WHERE user_id = ?",
      [loggedUserId],
    );
    data["favoriteIds"] = favRows.map((r) => r["provider_id"]);
  } else {
    data["favoriteIds"] = [];
  }

  data["categories"] = categories;
  data["providers"] = providers;
  data["query"] = q;
  data["selectedCats"] = catFilters;
  data["selectedPrice"] = maxPrice ? Number(maxPrice) : null;

  return renderFile(join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "recherche.ejs"), data, {
    root: DEFAULT_EJS_COMPONENT_DIR,
  });
}) satisfies PageHandler;
