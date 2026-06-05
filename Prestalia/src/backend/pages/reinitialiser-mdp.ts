import {renderFile} from "ejs";
import {
  DEFAULT_EJS_COMPONENT_DIR,
  DEFAULT_EJS_DYNAMIC_PAGE_DIR,
} from "../utils/constants";
import {join} from "path";
import {hasProps} from "../core";
import {cookieToJSON, verifyJWT} from "../utils/functions";
import {PageHandler} from "../utils/types";
import {RowDataPacket} from "mysql2";

export default (async (context, db) => {
  const cookies = cookieToJSON(context.headers.cookie);
  let user: {name: string; role: string} | undefined;

  if (hasProps(cookies, {token: "string"})) {
    const payload = verifyJWT(cookies.token);

    if (payload && hasProps(payload, {userId: "number"})) {
      const row = (
        await db.execute<RowDataPacket[]>(
          "SELECT name, role FROM users WHERE id = ?",
          [payload.userId],
        )
      )[0][0];

      if (row) user = row as {name: string; role: string};
    }
  }

  const token = context.url?.searchParams.get("token") ?? "";
  const errorParam = context.url?.searchParams.get("error");

  const errorMessages: Record<string, string> = {
    missing: "Veuillez remplir tous les champs.",
    weak: "Le mot de passe doit contenir au moins 13 caractères avec 8 caractères uniques.",
    invalid: "Ce lien de réinitialisation est invalide ou a déjà été utilisé.",
    expired: "Ce lien a expiré. Veuillez en demander un nouveau.",
    server: "Une erreur serveur est survenue. Veuillez réessayer.",
  };

  const errorMessage = errorParam ? (errorMessages[errorParam] ?? null) : null;

  return renderFile(
    join(DEFAULT_EJS_DYNAMIC_PAGE_DIR, "reinitialiser-mdp.ejs"),
    {user, token, errorMessage},
    {root: DEFAULT_EJS_COMPONENT_DIR},
  );
}) satisfies PageHandler;
