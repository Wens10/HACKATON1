import {Context, error, hasProps, workingDirPath} from "../../../core";
import {DatabaseSync} from "node:sqlite";
import busboy from "busboy";
import {cookieToJSON, isValidEmail, verifyJWT} from "../../../utils/functions";
import {fileTypeFromBuffer} from "file-type";
import {mkdir, writeFile} from "fs/promises";
import {join} from "path";
import {Days} from "../../../utils/enums";

const supportedExtForFiles = ["jpg", "pdf", "png", "apng", "webp"];

export default ((context, headers, db) => {
  const cookies = cookieToJSON(headers.cookie);

  if (!hasProps(cookies, {token: "string"}))
    return context.respond(401, {end: true});

  const payload = verifyJWT(cookies.token);

  if (!hasProps(payload, {userId: "number"}))
    return context.respond(401, {
      end: true,
      headers: {
        "set-cookie":
          "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
      },
    });

  try {
    const userId = payload.userId,
      user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);

    if (!user)
      return context.respond(401, {
        end: true,
        headers: {
          "set-cookie":
            "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict;",
        },
      });

    const bb = busboy({headers}),
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
      .on("field", (name, value) => {
        body[name] ??= value;
      })
      .on("close", async () => {
        if (typeof body["exp"] === "string")
          body["exp"] = parseInt(body["exp"]);
        if (typeof body["price"] === "string")
          body["price"] = parseFloat(body["price"]);
        if (typeof body["category"] === "string")
          body["category"] = parseFloat(body["category"]);

        body["days"] = 0;

        if (body["monday"] === "on") body["days"] |= Days.Monday;
        if (body["tuesday"] === "on") body["days"] |= Days.Tuesday;
        if (body["wednesday"] === "on") body["days"] |= Days.Wednesday;
        if (body["thursday"] === "on") body["days"] |= Days.Thursday;
        if (body["saturday"] === "on") body["days"] |= Days.Saturday;
        if (body["sunday"] === "on") body["days"] |= Days.Sunday;

        if (
          !hasProps(body, {
            name: "string",
            email: "string",
            tel: "string",
            city: "string",
            category: "number",
            descr: "string",
            exp: "number",
            price: "number",
            days: "number",
          })
        )
          return context.respond(400, {end: true});

        if (!body.name || body.name === "")
          return context.respond(400, {end: true});
        if (!body.city || body.city === "")
          return context.respond(400, {end: true});
        if (!body.descr || body.descr === "")
          return context.respond(400, {end: true});
        if (!body.tel || body.tel === "")
          return context.respond(400, {end: true});
        if (!body.email || body.email === "")
          return context.respond(400, {end: true});
        if (!isValidEmail(body.email)) return context.respond(400, {end: true});

        if ("files" in body) {
          if (
            Array.isArray(body.files) &&
            !body.files.find(
              (file) => !hasProps(file, {filename: "string", data: "buffer"}),
            )
          ) {
            const files = body.files as {
              filename: string;
              data: Buffer<ArrayBuffer>;
            }[];

            const results = await Promise.all(
              files.map(async (file) => {
                const fileType = await fileTypeFromBuffer(file.data);

                return fileType && supportedExtForFiles.includes(fileType?.ext);
              }),
            );

            if (results.includes(false) || results.includes(undefined)) return;

            files.forEach(async (file) => {
              try {
                await mkdir(join(workingDirPath, `/data/${userId}`), {
                  recursive: true,
                });

                writeFile(
                  join(workingDirPath, `/data/${userId}`, file.filename),
                  file.data,
                );
              } catch (err) {
                error(err);

                return;
              }
            });
          } else return;
        }

        try {
          const categoryId = db
            .prepare("SELECT id FROM categories WHERE id = ?")
            .get(body.category);

          if (!categoryId) return context.respond(400, {end: true});
        } catch (err) {
          error("Erreur lors de la récupération d'une catégorie", err);

          return context.respond(500, {end: true});
        }

        try {
          db.prepare(
            "UPDATE users SET role = 'provider', name = ?, email = ? WHERE id = ?",
          ).run(body.name, body.email, userId);
        } catch (err) {
          error("Erreur lors du changement du rôle d'un utilisateur", err);

          return context.respond(500, {end: true});
        }

        try {
          db.prepare(
            "INSERT INTO providers (tel, city, category, descr, exp, price, days) VALUES (?, ?, ?, ?, ?, ?)",
          ).run(
            body.tel,
            body.city,
            body.category,
            body.descr,
            body.exp,
            body.price,
            body.days,
          );

          return context.respond(303, {
            end: true,
            headers: {
              location: "/tableau_presta",
            },
          });
        } catch (err) {
          error(
            "Erreur lors de la création du compte provider d'un utilisateur",
            err,
          );

          return context.respond(500, {end: true});
        }
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
