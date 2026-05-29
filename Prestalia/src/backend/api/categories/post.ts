import {Context, error, hasProps, MIME_TYPES, workingDirPath} from "../../core";
import {DatabaseSync} from "node:sqlite";
import busboy from "busboy";
import {writeFile} from "fs/promises";
import {join} from "path";

export default ((context, headers, db) => {
  // const cookies = cookieToJSON(headers.cookie);

  // if (!hasProps(cookies, {token: "string"}))
  //   return context.respond(401, {end: true});

  // const payload = verifyJWT(cookies.token);

  // if (!hasProps(payload, {userId: "number"}))
  //   return context.respond(401, {end: true});

  try {
    // const userId = payload.userId,
    //   user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);

    // if (!user || !hasProps(user, {role: "string"}))
    //   return context.respond(401, {end: true});

    // if (user.role.toLowerCase() === "provider")
    //   return context.respond(303, {
    //     end: true,
    //     headers: {
    //       location: "/tableau_presta",
    //     },
    //   });

    const bb = busboy({headers, limits: {files: 1}}),
      body: Record<
        string,
        number | string | {filename: string; data: Buffer<ArrayBuffer>}[]
      > = {};

    bb.on("file", (name, stream, info) => {
      const filename = Buffer.from(info.filename, "latin1").toString("utf8");

      let data = Buffer.from([]);

      body[name] ??= [];

      stream
        .on(
          "data",
          (chunk) => (data = Buffer.concat([data, Buffer.from(chunk)])),
        )
        .on("end", () => {
          if (Array.isArray(body[name])) body[name].push({filename, data});
        });
    })
      .on("field", (name, value) => (body[name] ??= value))
      .on("close", async () => {
        if (!hasProps(body, {name: "string"}))
          return context.respond(400, {end: true});

        if (
          db.prepare("SELECT 1 FROM categories WHERE name = ?").get(body.name)
        )
          return context.respond(400, {end: true});

        const icon =
          hasProps(body, {icon: "array"}) &&
          hasProps(body.icon[0], {filename: "string", data: "buffer"})
            ? body.icon[0].data
            : null;

        const catId = db
          .prepare("INSERT INTO categories (name) VALUES (?)")
          .run(body.name).lastInsertRowid;

        if (icon) {
          const iconPath = join(
            "/data",
            `c${"userId".padStart(32, "0")}${catId.toString().padStart(32, "0")}.png`,
          );

          writeFile(join(workingDirPath, iconPath), icon).then(() => {
            db.prepare("UPDATE categories SET icon = ? WHERE id = ?").run(
              iconPath,
              catId,
            );
          });
        }

        const cat = db
          .prepare(
            `
              SELECT
                id,
                name,
                CASE
                  WHEN icon IS NULL THEN NULL
                  WHEN icon LIKE 'http%' THEN icon
                  ELSE 'https://localhost:8443' || REPLACE(icon, '\\', '/')
                END AS icon,
                created_at
              FROM
                categories WHERE id = ?
            `,
          )
          .get(catId);

        if (cat) {
          context.respond(201, {
            end: false,
            headers: {
              "content-type": MIME_TYPES[".json"],
              "location": `https://localhost:8443/api/categories/${catId}`,
            },
          });

          context.end(JSON.stringify(cat));
        } else
          context.respond(201, {
            end: true,
            headers: {
              location: `https://localhost:8443/api/categories/${catId}`,
            },
          });

        return;
      });

    return (context.protocol === "http1" ? context.req : context.stream).pipe(
      bb,
    );
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
) => void;
