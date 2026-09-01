import { db } from "hatchable";
import { requireAdmin, hashPassword, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id, name, phone, password } = req.body || {};
  if (!id || !name || String(name).trim().length < 2) return res.status(400).json({ error: "Name is required" });

  if (password) {
    if (String(password).length < 8) return res.status(400).json({ error: "PIN/password must be at least 8 characters" });
    const hash = await hashPassword(String(password));
    await db.query("UPDATE users SET name = $1, phone = $2, password_hash = $3, must_reset_password = false, updated_at = now() WHERE id = $4", [
      String(name).trim(), phone ? String(phone).trim() : null, hash, id,
    ]);
    await audit(admin.id, "password_changed", "member", id, String(name).trim());
  } else {
    await db.query("UPDATE users SET name = $1, phone = $2, updated_at = now() WHERE id = $3", [
      String(name).trim(), phone ? String(phone).trim() : null, id,
    ]);
    await audit(admin.id, "updated", "member", id, String(name).trim());
  }
  res.json({ success: true });
}