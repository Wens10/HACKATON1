import {Context, MIME_TYPES} from "../../core";
import {DatabaseSync} from "node:sqlite";

export default ((context, _headers, db) => {
  context.respond(200, {
    end: false,
    headers: {"content-type": MIME_TYPES[".json"]},
  });

  return context.end(
    JSON.stringify(
      db
        .prepare(
          `
            SELECT
              id,
              name,
              CASE
                WHEN icon IS NULL THEN NULL
                WHEN icon LIKE 'http%' THEN icon
                ELSE 'https://localhost:8443' || REPLACE(icon, '\\', '/')
              END AS icon,
              created_at
            FROM
              categories
          `,
        )
        .all(),
    ),
  );
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
) => void;
