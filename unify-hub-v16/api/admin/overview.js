import { db } from "hatchable";
import { requireAdmin } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const membersQ = db.query("SELECT COUNT(*)::int AS c FROM users WHERE status = 'active'");
  const activeQ = db.query("SELECT COUNT(*)::int AS c FROM tasks WHERE status != 'completed'");
  const overdueQ = db.query("SELECT COUNT(*)::int AS c FROM tasks WHERE status != 'completed' AND due_at IS NOT NULL AND due_at < now()");
  const completedWeekQ = db.query("SELECT COUNT(*)::int AS c FROM tasks WHERE status = 'completed' AND updated_at >= now() - interval '7 days'");
  const eventsQ = db.query("SELECT COUNT(*)::int AS c FROM events WHERE starts_at >= now()");
  const teamsQ = db.query("SELECT id, name, color FROM teams ORDER BY name");
  const teamTaskQ = db.query(`
    SELECT assigned_team_id AS team_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status != 'completed' AND due_at IS NOT NULL AND due_at < now())::int AS overdue
    FROM tasks WHERE assigned_team_id IS NOT NULL GROUP BY assigned_team_id
  `);

  const [membersR, activeR, overdueR, completedWeekR, eventsR, teamsR, teamTaskR] = await Promise.all([
    membersQ, activeQ, overdueQ, completedWeekQ, eventsQ, teamsQ, teamTaskQ,
  ]);

  const byTeam = {};
  teamTaskR.rows.forEach((r) => { byTeam[r.team_id] = r; });

  const teamProgress = teamsR.rows.map((t) => {
    const p = byTeam[t.id] || { total: 0, completed: 0, overdue: 0 };
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      total: p.total,
      completed: p.completed,
      overdue: p.overdue,
      pct: p.total ? Math.round((p.completed / p.total) * 100) : null,
    };
  });

  res.json({
    stats: {
      members: membersR.rows[0].c,
      activeTasks: activeR.rows[0].c,
      overdueTasks: overdueR.rows[0].c,
      completedThisWeek: completedWeekR.rows[0].c,
      upcomingEvents: eventsR.rows[0].c,
    },
    teamProgress,
  });
}