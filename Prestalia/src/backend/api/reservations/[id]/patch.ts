import {error, hasProps} from "../../../core";
import {cookieToJSON, verifyJWT} from "../../../utils/functions";
import {APIHandler} from "../../../utils/types";
import {RowDataPacket} from "mysql2";
import {CLEAR_TOKEN_COOKIE} from "../../../utils/constants";

export default (async (context, headers, db, reservationId) => {
  const cookies = cookieToJSON(headers.cookie);

  if (!hasProps(cookies, {token: "string"}))
    return context.respond(401, {end: true});

  const payload = verifyJWT(cookies.token);

  if (!hasProps(payload, {userId: "number"}))
    return context.respond(401, {
      end: true,
      headers: {"set-cookie": CLEAR_TOKEN_COOKIE},
    });

  let body = "";

  await new Promise<void>((resolve) => {
    (context.protocol === "http1" ? context.req : context.stream)
      .on("data", (chunk: Buffer) => (body += chunk))
      .on("end", resolve);
  });

  const params = new URLSearchParams(body);
  const status = params.get("status");

  if (status !== "confirmed" && status !== "rejected")
    return context.respond(400, {end: true});

  try {
    // Vérifier que l'utilisateur connecté est bien le prestataire de cette réservation
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT r.id FROM reservations r
       JOIN providers p ON r.provider = p.id
       WHERE r.id = ? AND p.user_id = ?`,
      [reservationId, payload.userId],
    );

    if (!rows[0]) return context.respond(403, {end: true});

    await db.execute("UPDATE reservations SET status = ? WHERE id = ?", [
      status,
      reservationId,
    ]);

    return context.respond(200, {end: true});
  } catch (err) {
    error("Erreur lors de la mise à jour du statut d'une réservation", err);
    return context.respond(500, {end: true});
  }
}) satisfies APIHandler;
