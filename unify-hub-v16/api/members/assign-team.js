import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId, teamId } = req.body || {};
  if (!userId || !teamId) return res.status(400).json({ error: "Missing userId or teamId" });
  await db.query("DELETE FROM memberships WHERE user_id = $1", [userId]);
  await db.query("INSERT INTO memberships (user_id, team_id) VALUES ($1, $2)", [userId, teamId]);
  await audit(admin.id, "assigned", "member", userId, `team:${teamId}`);
  res.json({ success: true });
}