import {error, hasProps} from "../../core";
import {cookieToJSON, verifyJWT} from "../../utils/functions";
import {APIHandler} from "../../utils/types";
import {RowDataPacket} from "mysql2";
import {CLEAR_TOKEN_COOKIE} from "../../utils/constants";

export default (async (context, headers, db) => {
  const cookies = cookieToJSON(headers.cookie);

  if (!hasProps(cookies, {token: "string"}))
    return context
      .respond(401, {headers: {"content-type": "application/json"}})
      .end(JSON.stringify({error: "Non connecté"}));

  const payload = verifyJWT(cookies.token);

  if (!hasProps(payload, {userId: "number"}))
    return context
      .respond(401, {
        headers: {
          "content-type": "application/json",
          "set-cookie": CLEAR_TOKEN_COOKIE,
        },
      })
      .end(JSON.stringify({error: "Token invalide"}));

  let body = "";

  await new Promise<void>((resolve) => {
    (context.protocol === "http1" ? context.req : context.stream)
      .on("data", (chunk: Buffer) => (body += chunk))
      .on("end", resolve);
  });

  const params = new URLSearchParams(body);
  const providerId = params.get("provider_id");

  if (!providerId)
    return context
      .respond(400, {headers: {"content-type": "application/json"}})
      .end(JSON.stringify({error: "provider_id manquant"}));

  try {
    // Vérifier si le favori existe déjà
    const [existing] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM favorites WHERE user_id = ? AND provider_id = ?",
      [payload.userId, providerId],
    );

    if (existing[0]) {
      // Supprimer le favori
      await db.execute(
        "DELETE FROM favorites WHERE user_id = ? AND provider_id = ?",
        [payload.userId, providerId],
      );

      return context
        .respond(200, {headers: {"content-type": "application/json"}})
        .end(JSON.stringify({action: "removed"}));
    } else {
      // Ajouter le favori
      await db.execute(
        "INSERT INTO favorites (user_id, provider_id) VALUES (?, ?)",
        [payload.userId, providerId],
      );

      return context
        .respond(200, {headers: {"content-type": "application/json"}})
        .end(JSON.stringify({action: "added"}));
    }
  } catch (err) {
    error("Erreur lors du toggle favori", err);

    return context
      .respond(500, {headers: {"content-type": "application/json"}})
      .end(JSON.stringify({error: "Erreur serveur"}));
  }
}) satisfies APIHandler;
