import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { title, description, startsAt, endsAt, location } = req.body || {};
  if (!title || String(title).trim().length < 2) return res.status(400).json({ error: "Title is required" });
  if (!startsAt) return res.status(400).json({ error: "Start date/time is required" });
  const { rows } = await db.query(
    `INSERT INTO events (title, description, starts_at, ends_at, location, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [String(title).trim(), description || null, startsAt, endsAt || null, location || null, admin.id]
  );
  await audit(admin.id, "created", "event", rows[0].id, String(title).trim());
  res.json({ success: true, id: rows[0].id });
}