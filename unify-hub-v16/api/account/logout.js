import { getCurrentUser, clearSessionCookie } from "lib/auth.js";
import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const header = req.headers?.cookie || "";
  const match = header.match(/uh_session=([^;]+)/);
  if (match) {
    await db.query("DELETE FROM sessions WHERE token = $1", [decodeURIComponent(match[1])]);
  }
  clearSessionCookie(res);
  res.json({ success: true });
}