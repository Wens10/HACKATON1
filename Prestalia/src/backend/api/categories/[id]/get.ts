import {Context, error, MIME_TYPES} from "../../../core";
import {getCategory} from "../../../utils/functions";
import {APIParams} from "../../../utils/types";

export default (async (context, _headers, db, categoryId) => {
  try {
    const cat = await getCategory(db, categoryId);

    if (!cat) context.respond(404, {end: true});
    else
      context
        .respond(200, {
          end: false,
          headers: {"content-type": MIME_TYPES[".json"]},
        })
        .end(JSON.stringify(cat));
  } catch (err) {
    error("Erreur lors de la récupération d'une catégorie avec un id", err);

    context.respond(500, {end: true});
  }
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  ...params: [...APIParams, ...id: number[]]
) => void;
