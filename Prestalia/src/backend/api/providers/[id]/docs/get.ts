import {join} from "path";
import {workingDirPath} from "../../../../core";
import {error, MIME_TYPES} from "../../../../core";
import {APIHandler} from "../../../../utils/types";
import {existsSync, readdirSync} from "fs";
import {RowDataPacket} from "mysql2";
import config from "../../../../config";

export default (async (context, _headers, db, providerId) => {
  try {
    const provider = (
      await db.execute<RowDataPacket[]>(
        `SELECT user_id FROM providers WHERE id = ?`,
        [providerId],
      )
    )[0][0];

    if (!provider) return context.respond(400, {end: true});

    const stringifiedUserId = provider["user_id"].toString();

    const dirPath = join(workingDirPath, "/data", stringifiedUserId);

    if (!existsSync(dirPath)) {
      context
        .respond(200, {
          end: false,
          headers: {"content-type": MIME_TYPES[".json"]},
        })
        .end(JSON.stringify([]));

      return;
    }

    const files = readdirSync(dirPath).map((filename) => ({
      name: filename,
      url: `https://${config.hostname}:${config.httpsPort}/data/${stringifiedUserId}/${filename}`,
    }));

    context
      .respond(200, {
        end: false,
        headers: {"content-type": MIME_TYPES[".json"]},
      })
      .end(JSON.stringify(files));
  } catch (err) {
    error("Erreur lors de la récupération des documents", err);

    context.respond(500, {end: true});
  }

  return;
}) satisfies APIHandler;
