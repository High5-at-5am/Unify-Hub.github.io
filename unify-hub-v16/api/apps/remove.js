import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing app id" });
  await db.query("DELETE FROM app_links WHERE id = $1", [id]);
  await audit(admin.id, "deleted", "app_link", id, null);
  res.json({ success: true });
}