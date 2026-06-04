import {error, hasProps, workingDirPath} from "../../../core";
import {writeFile} from "fs/promises";
import {join} from "path";
import {getCategory} from "../../../utils/functions";
import {randomUUID} from "crypto";
import {Pool, RowDataPacket} from "mysql2/promise";

export default (async (body, db, categoryId) => {
  if (
    !(
      await db.execute<RowDataPacket[]>(
        "SELECT 1 FROM categories WHERE id = ?",
        [categoryId],
      )
    )[0][0]
  )
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
    (
      await db.execute<RowDataPacket[]>(
        "SELECT 1 FROM categories WHERE name = ? AND id != ?",
        [body.name, categoryId],
      )
    )[0][0]
  )
    return {ok: false, status: 400};

  if (icon) {
    const iconPath = join("/data", `c${randomUUID().replace(/-/g, "")}.png`);

    await writeFile(join(workingDirPath, iconPath), icon);

    await db.execute("UPDATE categories SET icon = ? WHERE id = ?", [
      iconPath,
      categoryId,
    ]);
  }

  if (hasName)
    try {
      await db.execute("UPDATE categories SET name = ? WHERE id = ?", [
        body.name,
        categoryId,
      ]);
    } catch (err) {
      error("Erreur lors de la mise à jour du nom de la catégorie", err);

      return {ok: false, status: 500};
    }

  const cat = await getCategory(db, categoryId);

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
  db: Pool,
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
