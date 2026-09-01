import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { enabled } = req.body || {};
  const { rows: existing } = await db.query("SELECT id FROM organization_settings LIMIT 1");
  if (existing.length === 0) {
    await db.query("INSERT INTO organization_settings (affirmations_enabled) VALUES ($1)", [!!enabled]);
  } else {
    await db.query("UPDATE organization_settings SET affirmations_enabled = $1, updated_at = now() WHERE id = $2", [!!enabled, existing[0].id]);
  }
  await audit(admin.id, enabled ? "enabled" : "disabled", "affirmations", null, null);
  res.json({ success: true });
}