import { db } from "hatchable";
import { requireUser, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { name, phone } = req.body || {};
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: "Name must be at least 2 characters" });
  }
  await db.query("UPDATE users SET name = $1, phone = $2, updated_at = now() WHERE id = $3", [
    String(name).trim(),
    phone ? String(phone).trim() : null,
    user.id,
  ]);
  await audit(user.id, "updated", "profile", user.id, String(name).trim());
  res.json({ success: true });
}