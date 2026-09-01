import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const isAdmin = user.role === "admin";

  const teamsQ = db.query("SELECT * FROM teams ORDER BY name");
  const membersQ = isAdmin
    ? db.query(
        `SELECT u.id, u.name, u.email, u.username, u.role, u.member_id, u.phone, u.profile_image_url, u.status, u.created_at,
                m.team_id, t.name AS team_name
         FROM users u
         LEFT JOIN memberships m ON m.user_id = u.id
         LEFT JOIN teams t ON t.id = m.team_id
         ORDER BY u.created_at DESC`
      )
    : Promise.resolve({ rows: [] });
  const tasksQ = isAdmin
    ? db.query("SELECT * FROM tasks ORDER BY created_at DESC")
    : db.query(
        `SELECT t.* FROM tasks t
         WHERE t.assigned_user_id = $1
            OR t.assigned_team_id IN (SELECT team_id FROM memberships WHERE user_id = $1)
         ORDER BY t.created_at DESC`,
        [user.id]
      );
  const eventsQ = db.query("SELECT * FROM events ORDER BY starts_at DESC LIMIT 25");
  const announcementsAllQ = db.query("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 25");
  const notificationsQ = db.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30", [user.id]);
  const messagesQ = db.query("SELECT * FROM messages WHERE channel = 'general' ORDER BY created_at DESC LIMIT 50");
  const myTeamQ = db.query(
    `SELECT t.* FROM teams t JOIN memberships m ON m.team_id = t.id WHERE m.user_id = $1 LIMIT 1`,
    [user.id]
  );

  const [teamsR, membersR, tasksR, eventsR, announcementsAllR, notificationsR, messagesR, myTeamR] = await Promise.all([
    teamsQ, membersQ, tasksQ, eventsQ, announcementsAllQ, notificationsQ, messagesQ, myTeamQ,
  ]);

  let announcements = announcementsAllR.rows;
  if (!isAdmin) {
    const { rows: memberTeams } = await db.query("SELECT team_id FROM memberships WHERE user_id = $1", [user.id]);
    const allowed = new Set(memberTeams.map((r) => `team-${r.team_id}`));
    announcements = announcements.filter((a) => a.audience === "everyone" || allowed.has(a.audience));
  }

  res.json({
    teams: teamsR.rows,
    members: membersR.rows,
    tasks: tasksR.rows,
    events: eventsR.rows,
    announcements,
    notifications: notificationsR.rows,
    messages: messagesR.rows,
    unreadCount: notificationsR.rows.filter((n) => !n.read_at).length,
    myTeam: myTeamR.rows[0] || null,
  });
}