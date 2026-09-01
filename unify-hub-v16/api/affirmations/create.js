import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { message } = req.body || {};
  if (!message || String(message).trim().length < 3) return res.status(400).json({ error: "Message is too short" });
  const { rows } = await db.query("INSERT INTO affirmations (message, created_by_id) VALUES ($1, $2) RETURNING id", [String(message).trim(), admin.id]);
  await audit(admin.id, "created", "affirmation", rows[0].id, String(message).trim());
  res.json({ success: true, id: rows[0].id });
}