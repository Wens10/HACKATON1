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
  let user: {name: string; role: string} | undefined;

  if (hasProps(cookies, {token: "string"})) {
    const payload = verifyJWT(cookies.token);

    if (payload && hasProps(payload, {userId: "number"})) {
      const row = (
        await db.execute<RowDataPacket[]>(
          "SELECT name, role FROM users WHERE id = ?",
          [payload.userId],
        )
      )[0][0];

      if (row) user = row as {name: string; role: string};
    }
  }

  const sent = context.url?.searchParams.get("sent") === "1";

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "mot-de-passe-oublie.ejs"),
    {user, sent},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
