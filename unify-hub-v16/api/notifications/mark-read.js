import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing notification id" });
  await db.query("UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2", [id, user.id]);
  res.json({ success: true });
}