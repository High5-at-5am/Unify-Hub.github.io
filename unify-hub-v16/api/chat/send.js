import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { body, channel } = req.body || {};
  const ch = channel || "general";
  if (!body || !String(body).trim()) return res.status(400).json({ error: "Message can't be empty" });
  if (ch !== "general" && user.role !== "admin") {
    const teamId = ch.replace("team-", "");
    const { rows: mem } = await db.query("SELECT 1 FROM memberships WHERE user_id = $1 AND team_id = $2", [user.id, teamId]);
    if (!mem.length) return res.status(403).json({ error: "Not a member of that team" });
  }
  await db.query("INSERT INTO messages (body, channel, created_by_id) VALUES ($1, $2, $3)", [String(body).trim(), ch, user.id]);
  res.json({ success: true });
}