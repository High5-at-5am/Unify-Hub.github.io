import { db } from "hatchable";
import { hashPassword } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

// One-time setup: creates the first admin account. Safe to call more than
// once -- if an admin already exists AND has never completed a real
// password change (must_reset_password is still true), this re-issues a
// fresh temporary password instead of leaving a broken account stuck.
export default async function (req, res) {
  const { rows: admins } = await db.query("SELECT id, must_reset_password FROM users WHERE role = 'admin' LIMIT 1");
  const password = "Welcome123!";
  const hash = await hashPassword(password);

  if (admins.length === 0) {
    const { rows: anyUser } = await db.query("SELECT id FROM users LIMIT 1");
    if (anyUser.length > 0) {
      return res.status(200).json({ created: false, message: "Setup already complete." });
    }
    await db.query(
      `INSERT INTO users (username, password_hash, name, role, member_id, must_reset_password)
       VALUES ('admin', $1, 'Workspace Admin', 'admin', 'UH-001', true)`,
      [hash]
    );
    return res.json({ created: true, username: "admin", temporaryPassword: password });
  }

  if (admins[0].must_reset_password) {
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, admins[0].id]);
    return res.json({ created: false, reset: true, username: "admin", temporaryPassword: password });
  }

  res.status(200).json({ created: false, message: "Setup already complete." });
}