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
    `SELECT a.*, u.name AS uploader_name FROM task_attachments a LEFT JOIN users u ON u.id = a.uploaded_by_id WHERE a.task_id = $1 ORDER BY a.created_at DESC`,
    [taskId]
  );
  res.json({ attachments: rows });
}