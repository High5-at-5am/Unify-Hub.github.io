import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

// Deterministic "pick of the day" -- every visitor sees the same message on
// a given calendar day, and it rotates through the pool automatically.
export default async function (req, res) {
  const { rows: orgRows } = await db.query("SELECT affirmations_enabled FROM organization_settings LIMIT 1");
  const enabled = orgRows[0] ? orgRows[0].affirmations_enabled : true;
  if (!enabled) return res.json({ enabled: false, message: null });

  const { rows } = await db.query("SELECT id, message FROM affirmations ORDER BY created_at ASC");
  if (!rows.length) return res.json({ enabled: true, message: null });

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const pick = rows[dayOfYear % rows.length];
  res.json({ enabled: true, message: pick.message });
}