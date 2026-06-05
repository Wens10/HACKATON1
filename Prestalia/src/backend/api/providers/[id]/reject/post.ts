import {error, hasProps} from "../../../../core";
import {verifyJWT} from "../../../../utils/functions";
import {APIHandler} from "../../../../utils/types";
import {RowDataPacket} from "mysql2";

export default (async (context, headers, db, providerId) => {
  const authorizationHeader = headers.authorization;

  if (!authorizationHeader) return context.respond(400, {end: true});

  const [authScheme, token] = authorizationHeader.split(" ");

  if (!authScheme) return context.respond(400, {end: true});
  if (authScheme.toLowerCase() !== "bearer")
    return context.respond(400, {end: true});

  if (!token) return context.respond(400, {end: true});

  const payload = verifyJWT(token);

  if (!hasProps(payload, {userId: "number"}))
    return context.respond(401, {end: true});

  try {
    const provider = (
      await db.execute<RowDataPacket[]>(
        "SELECT valided FROM providers WHERE id = ?",
        [providerId],
      )
    )[0][0];

    if (!provider)
      return context.respond(400, {
        headers: {"content-type": "application/json"},
        end: true,
      });

    if (provider["valided"] !== null)
      return context.respond(400, {
        headers: {"content-type": "application/json"},
        end: true,
      });

    await db.execute("UPDATE providers SET valided = false WHERE id = ?", [
      providerId,
    ]);

    return context.respond(200, {
      headers: {"content-type": "application/json"},
      end: true,
    });
  } catch (err) {
    error("Erreur lors de la mise à jour d'un provider", err);

    return context
      .respond(500, {headers: {"content-type": "application/json"}})
      .end(JSON.stringify({error: "Erreur serveur"}));
  }
}) satisfies APIHandler;
