import {error, hasProps} from "../../core";
import {cookieToJSON, verifyJWT} from "../../utils/functions";
import {APIHandler} from "../../utils/types";
import {RowDataPacket} from "mysql2";
import {CLEAR_TOKEN_COOKIE} from "../../utils/constants";

// JS getDay() → bitmask (0=Sun, 1=Mon, ..., 6=Sat)
const DAY_BITS = [64, 1, 2, 4, 8, 16, 32];

export default (async (context, headers, db) => {
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
  const providerId = params.get("provider_id");
  const dateStr = params.get("date");
  const timeStr = params.get("time");

  if (!providerId || !dateStr || !timeStr)
    return context.respond(400, {end: true});

  const dateTime = new Date(`${dateStr}T${timeStr}:00`);

  if (isNaN(dateTime.getTime()) || dateTime <= new Date())
    return context.respond(400, {end: true});

  try {
    const [providerRows] = await db.execute<RowDataPacket[]>(
      "SELECT id, price, days FROM providers WHERE id = ?",
      [providerId],
    );

    const provider = providerRows[0];

    if (!provider) return context.respond(404, {end: true});

    // Vérifier que le jour est disponible
    const dayBit = DAY_BITS[dateTime.getDay()] ?? 0;

    if (!(provider["days"] & dayBit)) return context.respond(400, {end: true});

    await db.execute(
      "INSERT INTO reservations (author, provider, price, date) VALUES (?, ?, ?, ?)",
      [payload.userId, providerId, provider["price"], dateTime],
    );

    return context.respond(303, {
      headers: {location: "/tableau"},
      end: true,
    });
  } catch (err) {
    error("Erreur lors de la création d'une réservation", err);
    return context.respond(500, {end: true});
  }
}) satisfies APIHandler;
