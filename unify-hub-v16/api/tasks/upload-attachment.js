import { db, storage } from "hatchable";
import { requireUser, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const taskId = req.body?.taskId;
  const file = (req.files || [])[0];
  if (!taskId) return res.status(400).json({ error: "Missing taskId" });
  if (!file) return res.status(400).json({ error: "No file uploaded" });
  if (file.buffer.length > 10 * 1024 * 1024) return res.status(400).json({ error: "Files must be smaller than 10 MB" });

  const { rows } = await db.query("SELECT * FROM tasks WHERE id = $1", [taskId]);
  const task = rows[0];
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (user.role !== "admin" && task.assigned_user_id !== user.id) {
    if (!task.assigned_team_id) return res.status(403).json({ error: "Not your task" });
    const { rows: mem } = await db.query("SELECT 1 FROM memberships WHERE user_id = $1 AND team_id = $2", [user.id, task.assigned_team_id]);
    if (!mem.length) return res.status(403).json({ error: "Not your task" });
  }

  const key = `tasks/${taskId}/${user.id}/${Date.now()}-${file.filename}`;
  const url = await storage.put(key, file.buffer, file.contentType);
  const { rows: inserted } = await db.query(
    `INSERT INTO task_attachments (task_id, uploaded_by_id, file_name, file_key, file_url, mime_type, file_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [taskId, user.id, file.filename, key, url, file.contentType, file.buffer.length]
  );
  await audit(user.id, "uploaded", "task_attachment", inserted[0].id, file.filename);
  res.json({ url, id: inserted[0].id });
}