import {CLEAR_TOKEN_COOKIE} from "../utils/constants";
import {PageHandler} from "../utils/types";

export default (async (context) => {
  context.respond(307, {
    headers: {
      "location": "/",
      "set-cookie": CLEAR_TOKEN_COOKIE,
    },
    end: true,
  });

  return null;
}) satisfies PageHandler;
