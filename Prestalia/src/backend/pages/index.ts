import {renderFile} from "ejs";
import {
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {hasProps} from "../core";
import {cookieToJSON, verifyJWT} from "../utils/functions";
import {PageHandler} from "../utils/types";

export default (async (context, db) => {
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) throw null;

  const payload = verifyJWT(cookies.token);

  if (!hasProps(payload, {userId: "number"})) {
    context.respond(307, {
      headers: {
        "location": "/",
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
      end: true,
    });

    return null;
  }

  const user = db
    .prepare("SELECT name, role FROM users WHERE id = ?")
    .get(payload.userId);

  if (!user) {
    context.respond(307, {
      headers: {
        "location": "/",
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
      end: true,
    });

    return null;
  }

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "index.ejs"),
    {user},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
