import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const { rows: userRows } = await db.query(
    `SELECT u.*, m.team_id, t.name AS team_name, t.color AS team_color
     FROM users u LEFT JOIN memberships m ON m.user_id = u.id LEFT JOIN teams t ON t.id = m.team_id
     WHERE u.id = $1`,
    [id]
  );
  const target = userRows[0];
  if (!target) return res.status(404).json({ error: "Member not found" });

  const canSeeContact = user.role === "admin" || user.id === target.id;

  const assignedTasksQ = db.query(
    "SELECT id, title, status, priority, due_at FROM tasks WHERE assigned_user_id = $1 ORDER BY created_at DESC LIMIT 15",
    [id]
  );
  const completedCountQ = db.query("SELECT COUNT(*)::int AS c FROM tasks WHERE assigned_user_id = $1 AND status = 'completed'", [id]);
  const upcomingEventsQ = db.query(
    `SELECT e.id, e.title, e.starts_at, r.status AS rsvp_status FROM event_rsvps r
     JOIN events e ON e.id = r.event_id WHERE r.user_id = $1 AND e.starts_at >= now() ORDER BY e.starts_at ASC LIMIT 10`,
    [id]
  );
  const filesQ = db.query(
    `SELECT id, file_name, file_url, created_at, 'team' AS source FROM team_files WHERE uploaded_by_id = $1
     UNION ALL
     SELECT id, file_name, file_url, created_at, 'task' AS source FROM task_attachments WHERE uploaded_by_id = $1
     ORDER BY created_at DESC LIMIT 15`,
    [id]
  );
  const activityQ = user.role === "admin"
    ? db.query("SELECT action, entity_type, details, created_at FROM audit_logs WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 20", [id])
    : Promise.resolve({ rows: [] });

  const [assignedTasksR, completedCountR, upcomingEventsR, filesR, activityR] = await Promise.all([
    assignedTasksQ, completedCountQ, upcomingEventsQ, filesQ, activityQ,
  ]);

  res.json({
    id: target.id,
    name: target.name,
    memberId: target.member_id,
    role: target.role,
    status: target.status,
    profileImageUrl: target.profile_image_url,
    teamId: target.team_id,
    teamName: target.team_name,
    teamColor: target.team_color,
    phone: canSeeContact ? target.phone : null,
    email: canSeeContact ? target.email : null,
    createdAt: target.created_at,
    assignedTasks: assignedTasksR.rows,
    completedTaskCount: completedCountR.rows[0].c,
    upcomingEvents: upcomingEventsR.rows,
    files: filesR.rows,
    activity: activityR.rows,
  });
}