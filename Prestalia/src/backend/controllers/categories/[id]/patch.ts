import {error, hasProps, workingDirPath} from "../../../core";
import {DatabaseSync} from "node:sqlite";
import {writeFile} from "fs/promises";
import {join} from "path";
import {getCategory} from "../../../utils/functions";
import {randomUUID} from "crypto";

export default (async (body, db, categoryId) => {
  if (!db.prepare("SELECT 1 FROM categories WHERE id = ?").get(categoryId))
    return {ok: false, status: 404};

  const hasName = hasProps(body, {name: "string"}),
    icon =
      hasProps(body, {icon: "array"}) &&
      hasProps(body.icon[0], {filename: "string", data: "buffer"})
        ? body.icon[0].data
        : null;

  if (!icon && !hasName) return {ok: false, status: 404};

  if (
    hasName &&
    db
      .prepare("SELECT 1 FROM categories WHERE name = ? AND id != ?")
      .get(body.name, categoryId)
  )
    return {ok: false, status: 400};

  if (icon) {
    const iconPath = join("/data", `c${randomUUID().replace(/-/g, "")}.png`);

    await writeFile(join(workingDirPath, iconPath), icon).then(() => {
      db.prepare("UPDATE categories SET icon = ? WHERE id = ?").run(
        iconPath,
        categoryId,
      );
    });
  }

  if (hasName)
    try {
      db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(
        body.name,
        categoryId,
      );
    } catch (err) {
      error("Erreur lors de la mise à jour du nom de la catégorie", err);

      return {ok: false, status: 500};
    }

  const cat = getCategory(db, categoryId);

  if (cat)
    return {
      ok: true,
      status: 200,
      data: JSON.stringify(cat),
    };
  else
    return {
      ok: true,
      status: 200,
    };
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  body: Record<
    string,
    number | string | {filename: string; data: Buffer<ArrayBuffer>}[]
  >,
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
  // eslint-disable-next-line no-unused-vars
  categoryId: number,
) => Promise<
  | {
      ok: boolean;
      status: number;
      data?: never;
    }
  | {
      ok: boolean;
      status: number;
      data: string;
    }
>;
