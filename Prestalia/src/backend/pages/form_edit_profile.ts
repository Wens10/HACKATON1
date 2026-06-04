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
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) {
    context.respond(307, {
      headers: {location: "/auth?to=/form_edit_profile"},
      end: true,
    });
    return null;
  }

  const payload = verifyJWT(cookies.token);

  if (payload === false || !hasProps(payload, {userId: "number"})) {
    context.respond(307, {
      headers: {
        "location": "/auth?to=/form_edit_profile",
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
      end: true,
    });
    return null;
  }

  const [userRows] = await db.execute<RowDataPacket[]>(
    "SELECT name, email, role FROM users WHERE id = ?",
    [payload.userId],
  );

  const user = userRows[0];

  if (!user) {
    context.respond(307, {
      headers: {
        "location": "/",
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
      end: true,
    });
    return null;
  }

  let provider: RowDataPacket | null = null;

  if (user["role"] === "provider") {
    const [providerRows] = await db.execute<RowDataPacket[]>(
      "SELECT tel, city, descr FROM providers WHERE user_id = ?",
      [payload.userId],
    );
    provider = providerRows[0] ?? null;
  }

  const success = context.url?.searchParams.get("success") === "1",
    editError = context.url?.searchParams.get("error") === "1";

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "form_edit_profile.ejs"),
    {user, provider, success, editError},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
