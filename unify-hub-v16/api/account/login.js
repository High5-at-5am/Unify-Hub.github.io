import { db } from "hatchable";
import { verifyPassword, createSession, setSessionCookie, publicUser, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and PIN/password are required" });
  }
  const normalized = String(username).trim().toLowerCase();
  const { rows } = await db.query(
    "SELECT * FROM users WHERE lower(username) = $1 OR lower(member_id) = $1",
    [normalized]
  );
  const user = rows[0];
  if (!user || !user.password_hash || !(await verifyPassword(String(password), user.password_hash))) {
    return res.status(401).json({ error: "Username or password is incorrect." });
  }
  if (user.status !== "active") {
    return res.status(403).json({ error: "This account has been deactivated. Contact an admin." });
  }
  const { token } = await createSession(user.id);
  setSessionCookie(res, token);
  await db.query("UPDATE users SET last_signed_in = now() WHERE id = $1", [user.id]);
  await audit(user.id, "login", "session", user.id, `${user.name} signed in`);
  res.json({ user: publicUser(user) });
}