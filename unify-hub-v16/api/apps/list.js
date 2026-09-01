import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { rows } = await db.query("SELECT * FROM app_links ORDER BY sort_order ASC, created_at ASC");
  res.json({ apps: rows });
}