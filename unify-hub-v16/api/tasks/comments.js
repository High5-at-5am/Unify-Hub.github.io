import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const taskId = req.query.taskId;
  if (!taskId) return res.status(400).json({ error: "Missing taskId" });
  const { rows } = await db.query(
    `SELECT c.*, u.name AS author_name FROM task_comments c JOIN users u ON u.id = c.user_id WHERE c.task_id = $1 ORDER BY c.created_at ASC`,
    [taskId]
  );
  res.json({ comments: rows });
}