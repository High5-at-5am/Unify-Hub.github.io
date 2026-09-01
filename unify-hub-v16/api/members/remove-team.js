import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  await db.query("DELETE FROM memberships WHERE user_id = $1", [userId]);
  await audit(admin.id, "removed_from_team", "member", userId, null);
  res.json({ success: true });
}