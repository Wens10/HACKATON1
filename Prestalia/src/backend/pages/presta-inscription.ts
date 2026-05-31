import {renderFile} from "ejs";
import {
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {hasProps} from "../core";
import {cookieToJSON, getCategories, verifyJWT} from "../utils/functions";
import {PageHandler} from "../utils/types";

export default (async (context, db) => {
  const cookies = cookieToJSON(context.headers.cookie);

  if (!hasProps(cookies, {token: "string"})) {
    context.respond(307, {
      headers: {
        location: "/auth?to=/presta-inscriptions",
      },
      end: true,
    });

    return null;
  }

  const payload = verifyJWT(cookies.token);

  if (payload === false || !hasProps(payload, {userId: "number"})) {
    context.respond(307, {
      headers: {
        "location": "/auth?to=/presta-inscriptions",
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
      end: true,
    });

    return null;
  }

  const user = db
    .prepare("SELECT name, email, role FROM users WHERE id = ?")
    .get(payload.userId);

  if (!user) {
    context.respond(307, {
      headers: {
        "location": "/auth?to=/presta-inscriptions",
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
      end: true,
    });

    return null;
  }

  if (user["role"] === "admin") {
    context.respond(307, {
      headers: {
        location: "/",
      },
      end: true,
    });

    return null;
  }

  if (user["role"] === "provider") {
    context.respond(307, {
      headers: {
        location: "/tableau_presta",
      },
      end: true,
    });

    return null;
  }

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "presta-inscription.ejs"),
    {user, categories: getCategories(db, {})},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
