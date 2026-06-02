import {Context, error, hasProps} from "../../../core";
import {DatabaseSync} from "node:sqlite";
import {getCategory, verifyJWT} from "../../../utils/functions";

export default ((context, headers, db, categoryId) => {
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
      user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);

    if (!user || !hasProps(user, {id: "number", role: "string"}))
      return context.respond(401, {end: true});

    if (user.role.toLowerCase() !== "admin")
      return context.respond(401, {end: true});

    if (!db.prepare("SELECT 1 FROM categories WHERE id = ?").get(categoryId))
      return context.respond(404, {end: true});

    const cat = getCategory(db, categoryId);

    if (!cat) return context.respond(404, {end: true});

    if (cat["provider_count"] !== 0 || cat["reservation_count"] !== 0)
      return context.respond(409, {end: true});

    try {
      db.prepare("DELETE FROM categories WHERE id = ?").run(categoryId);

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
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
  // eslint-disable-next-line no-unused-vars
  categoryId: number,
) => void;
