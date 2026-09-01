import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const channel = req.query.channel || "general";
  if (channel !== "general" && user.role !== "admin") {
    const teamId = channel.replace("team-", "");
    const { rows: mem } = await db.query("SELECT 1 FROM memberships WHERE user_id = $1 AND team_id = $2", [user.id, teamId]);
    if (!mem.length) return res.status(403).json({ error: "Not a member of that team" });
  }
  const { rows } = await db.query(
    `SELECT m.*, u.name AS author_name FROM messages m JOIN users u ON u.id = m.created_by_id
     WHERE m.channel = $1 ORDER BY m.created_at DESC LIMIT 50`,
    [channel]
  );
  res.json({ messages: rows.reverse() });
}