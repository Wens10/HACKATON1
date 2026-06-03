import {RowDataPacket} from "mysql2";
import {error, hasProps} from "../../../core";
import {getCategory, verifyJWT} from "../../../utils/functions";
import {APIHandler} from "../../../utils/types";

export default (async (context, headers, db, categoryId) => {
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
    const userId = payload.userId,
      user = (
        await db.execute<RowDataPacket[]>(
          "SELECT id, role FROM users WHERE id = ?",
          [userId],
        )
      )[0][0];

    if (!user || !hasProps(user, {id: "number", role: "string"}))
      return context.respond(401, {end: true});

    if (user.role.toLowerCase() !== "admin")
      return context.respond(401, {end: true});

    if (
      !(
        await db.execute<RowDataPacket[]>(
          "SELECT 1 FROM categories WHERE id = ?",
          [categoryId],
        )
      )[0][0]
    )
      return context.respond(404, {end: true});

    const cat = await getCategory(db, categoryId);

    if (!cat) return context.respond(404, {end: true});

    if (cat["provider_count"] !== 0 || cat["reservation_count"] !== 0)
      return context.respond(409, {end: true});

    try {
      await db.execute("DELETE FROM categories WHERE id = ?", [categoryId]);

      return context.respond(204, {end: true});
    } catch (error) {
      return context.respond(500, {end: true});
    }
  } catch (err) {
    error("Erreur lors de la récupéaration d'un utilisateur par l'id", err);

    return context.respond(500, {
      end: true,
      headers: {
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
    });
  }
}) satisfies APIHandler;
