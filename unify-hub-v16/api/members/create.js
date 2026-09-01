import { db } from "hatchable";
import { requireAdmin, hashPassword, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { name, memberId, phone, password, teamId } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: "Name is required" });
  if (!memberId || String(memberId).trim().length < 2) return res.status(400).json({ error: "Member ID is required" });
  if (!password || String(password).length < 8) return res.status(400).json({ error: "PIN/password must be at least 8 characters" });

  const hash = await hashPassword(String(password));
  const username = String(memberId).trim().toLowerCase();
  let userId;
  try {
    const { rows } = await db.query(
      `INSERT INTO users (username, password_hash, name, member_id, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'user') RETURNING id`,
      [username, hash, String(name).trim(), String(memberId).trim(), phone ? String(phone).trim() : null]
    );
    userId = rows[0].id;
  } catch (e) {
    return res.status(400).json({ error: "That Member ID is already in use" });
  }
  if (teamId) {
    await db.query("INSERT INTO memberships (user_id, team_id) VALUES ($1, $2)", [userId, teamId]);
  }
  await audit(admin.id, "created", "member", userId, String(name).trim());
  res.json({ id: userId, username });
}