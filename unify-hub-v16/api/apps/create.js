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
  const { name, url, icon, description } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: "Name is required" });
  if (!url || !String(url).trim()) return res.status(400).json({ error: "URL is required" });

  const { rows: maxRows } = await db.query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM app_links");
  const nextOrder = maxRows[0].m + 1;

  const { rows } = await db.query(
    `INSERT INTO app_links (name, url, icon, description, sort_order, created_by_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [String(name).trim(), normalizeUrl(url), icon ? String(icon).trim() : null, description ? String(description).trim() : null, nextOrder, admin.id]
  );
  await audit(admin.id, "created", "app_link", rows[0].id, String(name).trim());
  res.json({ success: true, id: rows[0].id });
}