import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { title, description, priority, dueAt, assignedUserId, assignedTeamId } = req.body || {};
  if (!title || String(title).trim().length < 2) return res.status(400).json({ error: "Title is required" });
  const { rows } = await db.query(
    `INSERT INTO tasks (title, description, priority, due_at, assigned_user_id, assigned_team_id, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      String(title).trim(),
      description || null,
      priority || "medium",
      dueAt || null,
      assignedUserId || null,
      assignedTeamId || null,
      admin.id,
    ]
  );
  const id = rows[0].id;
  await audit(admin.id, "created", "task", id, String(title).trim());
  if (assignedUserId) {
    await db.query("INSERT INTO notifications (user_id, type, title, body) VALUES ($1, 'task', 'New task assigned', $2)", [
      assignedUserId, String(title).trim(),
    ]);
  }
  res.json({ id });
}