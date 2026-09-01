import { db } from "hatchable";
import { requireUser, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { primaryColor, setAsDefault } = req.body || {};

  // Empty/null clears the personal override, falling back to the org default.
  if (primaryColor !== null && primaryColor !== "" && primaryColor !== undefined && !HEX_RE.test(primaryColor)) {
    return res.status(400).json({ error: "Color must be a hex code like #f06b4e" });
  }
  const value = (primaryColor === null || primaryColor === "" || primaryColor === undefined) ? null : primaryColor;
  await db.query("UPDATE users SET custom_primary_color = $1, updated_at = now() WHERE id = $2", [value, user.id]);
  await audit(user.id, "updated", "personal_theme", user.id, value);

  if (setAsDefault && value) {
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can set the organization default" });
    }
    const { rows: existing } = await db.query("SELECT id FROM organization_settings LIMIT 1");
    if (existing.length === 0) {
      await db.query("INSERT INTO organization_settings (primary_color) VALUES ($1)", [value]);
    } else {
      await db.query("UPDATE organization_settings SET primary_color = $1, updated_at = now() WHERE id = $2", [value, existing[0].id]);
    }
    await audit(user.id, "updated", "theme", null, "set org default from personal color");
  }

  res.json({ success: true });
}