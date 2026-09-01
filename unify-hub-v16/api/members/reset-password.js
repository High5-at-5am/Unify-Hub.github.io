import { db } from "hatchable";
import { requireAdmin, generateTemporaryPassword, hashPassword, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing member id" });
  const temporaryPassword = generateTemporaryPassword();
  const hash = await hashPassword(temporaryPassword);
  await db.query("UPDATE users SET password_hash = $1, must_reset_password = true, updated_at = now() WHERE id = $2", [hash, id]);
  await audit(admin.id, "reset_password", "member", id, null);
  res.json({ temporaryPassword });
}