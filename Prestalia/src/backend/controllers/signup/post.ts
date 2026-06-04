import {error} from "../../core";
import {availableParallelism, totalmem} from "os";
import {sign} from "jsonwebtoken";
import {
  hashPassword,
  isValidEmail,
  isValidPassword,
} from "../../utils/functions";
import {Pool, ResultSetHeader, RowDataPacket} from "mysql2/promise";

const jwtSecret = process.env["JWT_SECRET"];

if (!jwtSecret) throw new Error("Le secret JWT est manquant");

export default (async (name, email, password, db) => {
  const normalizedName = name.trim().normalize("NFKC"),
    normalizedEmail = email.trim().normalize("NFKC").toLowerCase(),
    normalizedPassword = password.normalize("NFKC");

  if (!normalizedName || normalizedName === "") return {ok: false, status: 400};
  if (!normalizedEmail || normalizedEmail === "")
    return {ok: false, status: 400};
  if (!isValidEmail(normalizedEmail)) return {ok: false, status: 400};
  if (!normalizedPassword || normalizedPassword === "")
    return {ok: false, status: 400};
  if (!isValidPassword(normalizedPassword)) return {ok: false, status: 400};

  try {
    const userExist = (
      await db.execute<RowDataPacket[]>("SELECT 1 FROM users WHERE email = ?", [
        normalizedEmail,
      ])
    )[0][0];

    if (userExist) return {ok: false, status: 400};
  } catch (err) {
    error(err);

    return {ok: false, status: 500};
  }

  return hashPassword(
    normalizedPassword,
    {
      parallelism: Math.min(availableParallelism(), 8),
      tagLength: 64,
      memory: Math.floor(Math.min(totalmem() * 0.05, 1 << 28) / 1024),
      passes: 3,
    },
    {secret: process.env["ARGON2_SECRET"]},
  )
    .then(async (hash) => {
      try {
        const [result] = await db.execute<ResultSetHeader>(
          "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
          [normalizedName, normalizedEmail, hash],
        );

        const userId = result.insertId;

        try {
          const token = sign({userId}, jwtSecret, {
            expiresIn: "1h",
            algorithm: "HS512",
          });

          return {
            ok: true,
            token,
          };
        } catch (err) {
          error(err);

          return {ok: false, status: 500};
        }
      } catch (err) {
        error(err);

        return {ok: false, status: 500};
      }
    })
    .catch((reason) => {
      error(reason);

      return {ok: false, status: 500};
    });
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  name: string,
  // eslint-disable-next-line no-unused-vars
  email: string,
  // eslint-disable-next-line no-unused-vars
  password: string,
  // eslint-disable-next-line no-unused-vars
  db: Pool,
) => Promise<
  | {
      ok: boolean;
      token: string;
      status?: never;
    }
  | {
      ok: boolean;
      status: number;
    }
>;
