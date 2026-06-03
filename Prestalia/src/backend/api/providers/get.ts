import {error, MIME_TYPES} from "../../core";
import {APIHandler} from "../../utils/types";

export default (async (context, _headers, db) => {
  try {
    const providers = (
      await db.execute(`
      SELECT
        p.id,
        p.created_at,
        p.valided,
        p.tel,
        p.city,
        p.descr,
        p.exp,
        p.price,
        p.days,
        c.name,
        u.name,
        u.email
      FROM providers p
      LEFT JOIN categories c ON p.category = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE u.role = 'provider'
    `)
    )[0];

    context
      .respond(200, {
        end: false,
        headers: {"content-type": MIME_TYPES[".json"]},
      })
      .end(JSON.stringify(providers));
  } catch (err) {
    error("Erreur lors de la récupération des prestataires", err);

    context.respond(500, {end: true});
  }
}) satisfies APIHandler;
