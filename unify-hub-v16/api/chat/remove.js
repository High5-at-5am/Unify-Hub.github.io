import { db } from "hatchable";
import { requireUser, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing message id" });
  const { rows } = await db.query("SELECT created_by_id FROM messages WHERE id = $1", [id]);
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  if (user.role !== "admin" && rows[0].created_by_id !== user.id) {
    return res.status(403).json({ error: "You can only delete your own messages" });
  }
  await db.query("DELETE FROM messages WHERE id = $1", [id]);
  await audit(user.id, "deleted", "message", id, null);
  res.json({ success: true });
}