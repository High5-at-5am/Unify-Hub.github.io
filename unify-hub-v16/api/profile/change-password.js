import { db } from "hatchable";
import { requireUser, verifyPassword, hashPassword, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password/PIN must be at least 8 characters" });
  }
  if (!user.must_reset_password) {
    if (!currentPassword || !(await verifyPassword(String(currentPassword), user.password_hash))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
  }
  const hash = await hashPassword(String(newPassword));
  await db.query("UPDATE users SET password_hash = $1, must_reset_password = false, updated_at = now() WHERE id = $2", [hash, user.id]);
  await audit(user.id, "password_changed", "profile", user.id, null);
  res.json({ success: true });
}