import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id, name, description, leaderId } = req.body || {};
  if (!id || !name || String(name).trim().length < 2) {
    return res.status(400).json({ error: "Team name is required" });
  }
  await db.query("UPDATE teams SET name = $1, description = $2, leader_id = $3 WHERE id = $4", [
    String(name).trim(),
    description ? String(description).trim() : null,
    leaderId || null,
    id,
  ]);
  await audit(admin.id, "updated", "team", id, String(name).trim());
  res.json({ success: true });
}