import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id, title, body, priority, audience } = req.body || {};
  if (!id || !title || String(title).trim().length < 2) return res.status(400).json({ error: "Title is required" });
  await db.query("UPDATE announcements SET title = $1, body = $2, priority = $3, audience = $4 WHERE id = $5", [
    String(title).trim(), String(body || "").trim(), priority || "normal", audience || "everyone", id,
  ]);
  await audit(admin.id, "updated", "announcement", id, String(title).trim());
  res.json({ success: true });
}