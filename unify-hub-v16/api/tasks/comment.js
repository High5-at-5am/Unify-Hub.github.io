import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { taskId, comment } = req.body || {};
  if (!taskId || !comment || !String(comment).trim()) return res.status(400).json({ error: "Comment can't be empty" });
  await db.query("INSERT INTO task_comments (task_id, user_id, comment) VALUES ($1, $2, $3)", [taskId, user.id, String(comment).trim()]);
  res.json({ success: true });
}