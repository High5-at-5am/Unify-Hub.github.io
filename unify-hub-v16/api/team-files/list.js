import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const teamId = req.query.teamId;
  if (!teamId) return res.status(400).json({ error: "Missing teamId" });
  if (user.role !== "admin") {
    const { rows: mem } = await db.query("SELECT 1 FROM memberships WHERE user_id = $1 AND team_id = $2", [user.id, teamId]);
    if (!mem.length) return res.status(403).json({ error: "Not a member of that team" });
  }
  const { rows } = await db.query(
    `SELECT f.*, u.name AS uploader_name FROM team_files f LEFT JOIN users u ON u.id = f.uploaded_by_id
     WHERE f.team_id = $1 ORDER BY f.created_at DESC`,
    [teamId]
  );
  res.json({ files: rows });
}