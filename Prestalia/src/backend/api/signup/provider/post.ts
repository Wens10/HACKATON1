import {Context, error, hasProps, log, workingDirPath} from "../../../core";
import {DatabaseSync} from "node:sqlite";
import busboy from "busboy";
import {isValidEmail} from "../../../utils/functions";
import {fileTypeFromBuffer} from "file-type";
import {writeFile} from "fs/promises";
import {join} from "path";

const jwtSecret = process.env["JWT_SECRET"];

if (!jwtSecret) throw new Error("Le secret JWT est manquant");

const supportedExtForFiles = ["jpg", "pdf", "png", "apng", "webp"];

export default ((context, headers) => {
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
      .on("data", (chunk) => (data = Buffer.concat([data, Buffer.from(chunk)])))
      .on("end", () => {
        if (Array.isArray(body[name])) body[name].push({filename, data});
      });
  })
    .on("field", (name, value) => {
      body[name] ??= value;
    })
    .on("close", async () => {
      if (typeof body["exp"] === "string") body["exp"] = parseInt(body["exp"]);
      if (typeof body["price"] === "string")
        body["price"] = parseFloat(body["price"]);

      if (
        hasProps(body, {
          name: "string",
          email: "string",
          tel: "string",
          city: "string",
          category: "string",
          descr: "string",
          exp: "number",
          price: "number",
        })
      ) {
        if (!isValidEmail(body.email)) return;

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

            files.forEach((file) => {
              try {
                writeFile(
                  join(workingDirPath, "/data", file.filename),
                  file.data,
                );
              } catch (err) {
                error(err);

                return;
              }
            });
          } else return;
        }

        log("close", body);
      }
    });

  (context.protocol === "http1" ? context.req : context.stream).pipe(bb);
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  db: DatabaseSync,
) => void;
