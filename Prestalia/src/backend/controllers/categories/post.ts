import {hasProps, workingDirPath} from "../../core";
import {writeFile} from "fs/promises";
import {join} from "path";
import {getCategory} from "../../utils/functions";
import {randomUUID} from "crypto";
import {Pool, ResultSetHeader, RowDataPacket} from "mysql2/promise";
import config from "../../config";

export default (async (body, db) => {
  if (!hasProps(body, {name: "string"})) return {ok: false, status: 400};

  if (
    (
      await db.execute<RowDataPacket[]>(
        "SELECT 1 FROM categories WHERE name = ?",
        [body.name],
      )
    )[0][0]
  )
    return {ok: false, status: 400};

  const icon =
    hasProps(body, {icon: "array"}) &&
    hasProps(body.icon[0], {filename: "string", data: "buffer"})
      ? body.icon[0].data
      : null;

  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO categories (name) VALUES (?)",
    [body.name],
  );

  const catId = result.insertId;

  if (icon) {
    const iconPath = join("/data", `c${randomUUID().replace(/-/g, "")}.png`);

    await writeFile(join(workingDirPath, iconPath), icon);

    await db.execute("UPDATE categories SET icon = ? WHERE id = ?", [
      iconPath,
      catId,
    ]);
  }

  const cat = await getCategory(db, catId);

  if (cat)
    return {
      ok: true,
      status: 201,
      data: JSON.stringify(cat),
      location: `https://${config.hostname}:${config.httpsPort}/api/categories/${catId}`,
    };
  else
    return {
      ok: true,
      status: 201,
      location: `https://${config.hostname}:${config.httpsPort}/api/categories/${catId}`,
    };
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  body: Record<
    string,
    number | string | {filename: string; data: Buffer<ArrayBuffer>}[]
  >,
  // eslint-disable-next-line no-unused-vars
  db: Pool,
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
