import { db } from "hatchable";
import { requireAdmin } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

// Bulk-save the display order after a drag/reorder -- body: { orderedIds: [id, id, ...] }
export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
  for (let i = 0; i < orderedIds.length; i++) {
    await db.query("UPDATE app_links SET sort_order = $1 WHERE id = $2", [i, orderedIds[i]]);
  }
  res.json({ success: true });
}