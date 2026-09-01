import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id, title, description, priority, dueAt } = req.body || {};
  if (!id || !title || String(title).trim().length < 2) return res.status(400).json({ error: "Title is required" });
  await db.query("UPDATE tasks SET title = $1, description = $2, priority = $3, due_at = $4, updated_at = now() WHERE id = $5", [
    String(title).trim(), description || null, priority || "medium", dueAt || null, id,
  ]);
  await audit(admin.id, "updated", "task", id, String(title).trim());
  res.json({ success: true });
}