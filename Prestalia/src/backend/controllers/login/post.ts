import {error, hasProps} from "../../core";
import {sign} from "jsonwebtoken";
import {verifyPassword} from "../../utils/functions";
import {Pool, RowDataPacket} from "mysql2/promise";

const jwtSecret = process.env["JWT_SECRET"];

if (!jwtSecret) throw new Error("Le secret JWT est manquant");

export default (async (email, password, db) => {
  const normalizedEmail = email.trim().normalize("NFKC").toLowerCase(),
    normalizedPassword = password.normalize("NFKC");

  if (normalizedEmail === "") return {ok: false, status: 400};
  if (normalizedPassword === "") return {ok: false, status: 400};

  try {
    const user = (
      await db.execute<RowDataPacket[]>(
        "SELECT id, password FROM users WHERE email = ?",
        [normalizedEmail],
      )
    )[0][0];

    if (!user) return {ok: false, status: 401};

    if (!hasProps(user, {password: "string", id: "number"}))
      return {ok: false, status: 500};

    return verifyPassword(
      user.password,
      normalizedPassword,
      process.env["ARGON2_SECRET"],
    )
      .then((isEqual) => {
        if (!isEqual) return {ok: false, status: 401};

        try {
          const token = sign({userId: user.id}, jwtSecret, {
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
      })
      .catch((reason) => {
        error(reason);

        return {ok: false, status: 500};
      });
  } catch (err) {
    error(err);

    return {ok: false, status: 500};
  }
}) satisfies (
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
