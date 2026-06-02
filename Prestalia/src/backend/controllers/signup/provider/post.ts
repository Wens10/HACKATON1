import {error, hasProps, workingDirPath} from "../../../core";
import {isValidEmail} from "../../../utils/functions";
import {fileTypeFromBuffer} from "file-type";
import {mkdir, writeFile} from "fs/promises";
import {extname, join} from "path";
import {Days} from "../../../utils/enums";
import {randomUUID} from "crypto";
import {Pool, RowDataPacket} from "mysql2/promise";

const supportedExtForFiles = ["jpg", "pdf", "png", "apng", "webp"];

export default (async (body, userId, db) => {
  if (typeof body["exp"] === "string") body["exp"] = parseInt(body["exp"]);
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
    return {ok: false, status: 400};

  if (!body.name || body.name === "") return {ok: false, status: 400};
  if (!body.city || body.city === "") return {ok: false, status: 400};
  if (!body.descr || body.descr === "") return {ok: false, status: 400};
  if (!body.tel || body.tel === "") return {ok: false, status: 400};
  if (!body.email || body.email === "") return {ok: false, status: 400};
  if (!isValidEmail(body.email)) return {ok: false, status: 400};

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

      if (results.includes(false) || results.includes(undefined))
        return {ok: false, status: 400};

      for (const file of files) {
        try {
          await mkdir(join(workingDirPath, `/data/${userId}`), {
            recursive: true,
          });

          await writeFile(
            join(
              workingDirPath,
              `/data/${userId}`,
              `${randomUUID()}${extname(file.filename)}`,
            ),
            file.data,
          );
        } catch (err) {
          error(
            "Erreur lors de la sauvegarde des fichiers d'un prestataire",
            err,
          );

          return {ok: false, status: 500};
        }
      }
    } else return {ok: false, status: 400};
  }

  try {
    const categoryId = (
      await db.execute<RowDataPacket[]>(
        "SELECT id FROM categories WHERE id = ?",
        [body.category],
      )
    )[0][0];

    if (!categoryId) return {ok: false, status: 400};
  } catch (err) {
    error("Erreur lors de la récupération d'une catégorie", err);

    return {ok: false, status: 500};
  }

  try {
    await db.execute(
      "UPDATE users SET role = 'provider', name = ?, email = ? WHERE id = ?",
      [body.name, body.email, userId],
    );
  } catch (err) {
    error("Erreur lors du changement du rôle d'un utilisateur", err);

    return {ok: false, status: 500};
  }

  try {
    await db.execute(
      "INSERT INTO providers (tel, city, category, descr, exp, price, days) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        body.tel,
        body.city,
        body.category,
        body.descr,
        body.exp,
        body.price,
        body.days,
      ],
    );

    return {ok: true};
  } catch (err) {
    error(
      "Erreur lors de la création du compte provider d'un utilisateur",
      err,
    );

    return {ok: false, status: 500};
  }
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  body: Record<
    string,
    number | string | {filename: string; data: Buffer<ArrayBuffer>}[]
  >,
  // eslint-disable-next-line no-unused-vars
  userId: number,
  // eslint-disable-next-line no-unused-vars
  db: Pool,
) => Promise<
  | {
      ok: boolean;
      status: number;
    }
  | {
      ok: boolean;
      status?: never;
    }
>;
