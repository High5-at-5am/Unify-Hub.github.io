import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

function normalizeUrl(url) {
  const trimmed = String(url).trim();
  if (!/^https?:\/\//i.test(trimmed)) return "https://" + trimmed;
  return trimmed;
}

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id, name, url, icon, description } = req.body || {};
  if (!id || !name || String(name).trim().length < 2) return res.status(400).json({ error: "Name is required" });
  if (!url || !String(url).trim()) return res.status(400).json({ error: "URL is required" });
  await db.query("UPDATE app_links SET name = $1, url = $2, icon = $3, description = $4 WHERE id = $5", [
    String(name).trim(), normalizeUrl(url), icon ? String(icon).trim() : null, description ? String(description).trim() : null, id,
  ]);
  await audit(admin.id, "updated", "app_link", id, String(name).trim());
  res.json({ success: true });
}