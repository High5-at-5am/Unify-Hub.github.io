import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing member id" });
  const { rows } = await db.query("SELECT id FROM users WHERE role = 'admin'");
  if (rows.length >= 5) {
    return res.status(412).json({ error: "The workspace already has five administrators." });
  }
  await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [id]);
  await audit(admin.id, "promoted", "member", id, null);
  res.json({ success: true });
}