import {error, hasProps} from "../../../core";
import busboy from "busboy";
import {cookieToJSON, verifyJWT} from "../../../utils/functions";
import {APIHandler} from "../../../utils/types";
import {CLEAR_TOKEN_COOKIE} from "../../../utils/constants";
import {RowDataPacket} from "mysql2";

export default ((context, headers, db) => {
  const cookies = cookieToJSON(headers.cookie);

  if (!hasProps(cookies, {token: "string"}))
    return context.respond(303, {
      end: true,
      headers: {location: "/auth?to=/form_edit_profile"},
    });

  const payload = verifyJWT(cookies.token);

  if (!hasProps(payload, {userId: "number"}))
    return context.respond(303, {
      end: true,
      headers: {
        "location": "/auth?to=/form_edit_profile",
        "set-cookie": CLEAR_TOKEN_COOKIE,
      },
    });

  const userId = payload.userId;

  return db
    .execute<RowDataPacket[]>("SELECT role FROM users WHERE id = ?", [userId])
    .then(([rows]): void => {
      const user = rows[0];

      if (!user) {
        context.respond(303, {
          end: true,
          headers: {"location": "/", "set-cookie": CLEAR_TOKEN_COOKIE},
        });
        return;
      }

      const bb = busboy({headers}),
        fields: Record<string, string> = {};

      bb.on("field", (name, value) => {
        fields[name] = value.trim();
      })
        .on("file", (_name, stream) => stream.resume())
        .on("close", async () => {
          try {
            const name = fields["fullName"],
              email = fields["email"]?.toLowerCase().normalize("NFKC");

            if (name)
              await db.execute("UPDATE users SET name = ? WHERE id = ?", [
                name,
                userId,
              ]);

            if (email)
              await db.execute("UPDATE users SET email = ? WHERE id = ?", [
                email,
                userId,
              ]);

            if (hasProps(user, {role: "string"}) && user.role === "provider") {
              const updates: string[] = [],
                values: (string | number)[] = [];

              if ("phone" in fields) {
                updates.push("tel = ?");
                values.push(fields["phone"]);
              }
              if ("city" in fields) {
                updates.push("city = ?");
                values.push(fields["city"]);
              }
              if ("description" in fields) {
                updates.push("descr = ?");
                values.push(fields["description"]);
              }

              if (updates.length > 0) {
                values.push(userId);
                await db.execute(
                  `UPDATE providers SET ${updates.join(", ")} WHERE user_id = ?`,
                  values,
                );
              }
            }

            context.respond(303, {
              end: true,
              headers: {location: "/form_edit_profile?success=1"},
            });
          } catch (err) {
            error("Erreur lors de la mise à jour du profil :", err);
            context.respond(303, {
              end: true,
              headers: {location: "/form_edit_profile?error=1"},
            });
          }
        });

      (context.protocol === "http1" ? context.req : context.stream).pipe(bb);
    })
    .catch((err) => {
      error("Erreur lors de la récupération du profil :", err);
      context.respond(500, {
        end: true,
        headers: {"set-cookie": CLEAR_TOKEN_COOKIE},
      });
    });
}) satisfies APIHandler;
