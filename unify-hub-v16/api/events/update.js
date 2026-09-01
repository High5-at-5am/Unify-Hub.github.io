import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id, title, description, startsAt, endsAt, location } = req.body || {};
  if (!id || !title || String(title).trim().length < 2) return res.status(400).json({ error: "Title is required" });
  await db.query("UPDATE events SET title = $1, description = $2, starts_at = $3, ends_at = $4, location = $5 WHERE id = $6", [
    String(title).trim(), description || null, startsAt, endsAt || null, location || null, id,
  ]);
  await audit(admin.id, "updated", "event", id, String(title).trim());
  res.json({ success: true });
}