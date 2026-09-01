import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { orgName, primaryColor, teamColors } = req.body || {};

  if (orgName !== undefined && String(orgName).trim().length < 2) {
    return res.status(400).json({ error: "Organization name is too short" });
  }
  if (primaryColor !== undefined && !HEX_RE.test(primaryColor)) {
    return res.status(400).json({ error: "Primary color must be a hex code like #f06b4e" });
  }
  if (teamColors) {
    for (const c of Object.values(teamColors)) {
      if (!HEX_RE.test(c)) return res.status(400).json({ error: "Team colors must be hex codes like #f06b4e" });
    }
  }

  const { rows: existing } = await db.query("SELECT id FROM organization_settings LIMIT 1");
  if (existing.length === 0) {
    await db.query("INSERT INTO organization_settings (name, primary_color) VALUES ($1, $2)", [
      orgName ? String(orgName).trim() : "Unify Hub",
      primaryColor || "#f06b4e",
    ]);
  } else {
    const sets = [];
    const params = [];
    if (orgName !== undefined) { params.push(String(orgName).trim()); sets.push(`name = $${params.length}`); }
    if (primaryColor !== undefined) { params.push(primaryColor); sets.push(`primary_color = $${params.length}`); }
    if (sets.length) {
      params.push(existing[0].id);
      await db.query(`UPDATE organization_settings SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length}`, params);
    }
  }

  if (teamColors) {
    for (const [teamId, color] of Object.entries(teamColors)) {
      await db.query("UPDATE teams SET color = $1 WHERE id = $2", [color, teamId]);
    }
  }

  await audit(admin.id, "updated", "theme", null, orgName || null);
  res.json({ success: true });
}