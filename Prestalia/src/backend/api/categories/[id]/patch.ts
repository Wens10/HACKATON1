import {Context, error, hasProps, MIME_TYPES} from "../../../core";
import {DatabaseSync} from "node:sqlite";
import busboy from "busboy";
import {verifyJWT} from "../../../utils/functions";
import updateCategory from "../../../controllers/categories/[id]/patch";

export default ((context, headers, db, categoryId) => {
  const authorizationHeader = headers.authorization;

  if (!authorizationHeader) return context.respond(400, {end: true});

  const [authScheme, token] = authorizationHeader.split(" ");

  if (!authScheme) return context.respond(400, {end: true});
  if (authScheme.toLowerCase() !== "bearer")
    return context.respond(400, {end: true});

  if (!token) return context.respond(400, {end: true});

  const payload = verifyJWT(token);

  if (!hasProps(payload, {userId: "number"}))
    return context.respond(401, {end: true});

  try {
    const userId = payload.userId,
      user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);

    if (!user || !hasProps(user, {id: "number", role: "string"}))
      return context.respond(401, {end: true});

    if (user.role.toLowerCase() !== "admin")
      return context.respond(401, {end: true});

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
      .on("filesLimit", () => context.respond(413, {end: true}))
      .on("field", (name, value) => (body[name] ??= value))
      .on("close", async () => {
        const result = await updateCategory(body, db, categoryId);

        if (!result.ok) return context.respond(result.status, {end: true});

        if (result.data) {
          context.respond(200, {
            end: false,
            headers: {"content-type": MIME_TYPES[".json"]},
          });

          context.end(result.data);
        } else context.respond(200, {end: true});

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
  // eslint-disable-next-line no-unused-vars
  categoryId: number,
) => void;
