import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { title, body, priority, audience } = req.body || {};
  if (!title || String(title).trim().length < 2) return res.status(400).json({ error: "Title is required" });
  if (!body || String(body).trim().length < 2) return res.status(400).json({ error: "Body is required" });
  const { rows } = await db.query(
    `INSERT INTO announcements (title, body, priority, audience, created_by_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [String(title).trim(), String(body).trim(), priority || "normal", audience || "everyone", admin.id]
  );
  await audit(admin.id, "created", "announcement", rows[0].id, String(title).trim());
  res.json({ success: true, id: rows[0].id });
}