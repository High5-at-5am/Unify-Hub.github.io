import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

// Lightweight org directory available to every signed-in account (not just
// admins) -- basic non-sensitive fields only. Full management data (email,
// exact status list including inactive, etc.) stays behind /api/dashboard
// for admins.
export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.member_id, u.role, u.profile_image_url, u.status, m.team_id, t.name AS team_name
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     LEFT JOIN teams t ON t.id = m.team_id
     WHERE u.status = 'active'
     ORDER BY u.name ASC`
  );
  res.json({ members: rows });
}