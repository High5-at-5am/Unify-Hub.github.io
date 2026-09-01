import { db } from "hatchable";
import { requireUser, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

const VALID = ["not_started", "in_progress", "completed"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { id, status } = req.body || {};
  if (!id || !VALID.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const { rows } = await db.query("SELECT * FROM tasks WHERE id = $1", [id]);
  const task = rows[0];
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (user.role !== "admin" && task.assigned_user_id !== user.id) {
    if (!task.assigned_team_id) return res.status(403).json({ error: "Not your task" });
    const { rows: mem } = await db.query("SELECT 1 FROM memberships WHERE user_id = $1 AND team_id = $2", [user.id, task.assigned_team_id]);
    if (!mem.length) return res.status(403).json({ error: "Not your task" });
  }

  await db.query("UPDATE tasks SET status = $1, updated_at = now() WHERE id = $2", [status, id]);
  await audit(user.id, status === "completed" ? "completed" : "updated", "task", id, null);
  res.json({ success: true });
}