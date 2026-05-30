import {hasProps, workingDirPath} from "../../core";
import {DatabaseSync} from "node:sqlite";
import {writeFile} from "fs/promises";
import {join} from "path";
import {getCategory} from "../../utils/functions";
import {randomUUID} from "crypto";

export default (async (body, db) => {
  if (!hasProps(body, {name: "string"})) return {ok: false, status: 400};

  if (db.prepare("SELECT 1 FROM categories WHERE name = ?").get(body.name))
    return {ok: false, status: 400};

  const icon =
    hasProps(body, {icon: "array"}) &&
    hasProps(body.icon[0], {filename: "string", data: "buffer"})
      ? body.icon[0].data
      : null;

  const catId = db
    .prepare("INSERT INTO categories (name) VALUES (?)")
    .run(body.name).lastInsertRowid;

  if (icon) {
    const iconPath = join("/data", `c${randomUUID().replace(/-/g, "")}.png`);

    await writeFile(join(workingDirPath, iconPath), icon).then(() => {
      db.prepare("UPDATE categories SET icon = ? WHERE id = ?").run(
        iconPath,
        catId,
      );
    });
  }

  const cat = getCategory(db, catId);

  if (cat)
    return {
      ok: true,
      status: 201,
      data: JSON.stringify(cat),
      location: `https://localhost:8443/api/categories/${catId}`,
    };
  else
    return {
      ok: true,
      status: 201,
      location: `https://localhost:8443/api/categories/${catId}`,
    };
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  body: Record<
    string,
    number | string | {filename: string; data: Buffer<ArrayBuffer>}[]
  >,
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
) => Promise<
  | {
      ok: boolean;
      status: number;
      data?: never;
      location?: never;
    }
  | {
      ok: boolean;
      status: number;
      data: string;
      location: string;
    }
  | {
      ok: boolean;
      status: number;
      location: string;
      data?: never;
    }
>;
