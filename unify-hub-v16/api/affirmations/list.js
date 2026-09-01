import { db } from "hatchable";
import { requireAdmin } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { rows: orgRows } = await db.query("SELECT affirmations_enabled FROM organization_settings LIMIT 1");
  const { rows } = await db.query("SELECT id, message, created_at FROM affirmations ORDER BY created_at ASC");
  res.json({ enabled: orgRows[0] ? orgRows[0].affirmations_enabled : true, affirmations: rows });
}