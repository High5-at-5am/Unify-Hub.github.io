import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId, status } = req.body || {};
  if (!userId || !["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "Missing userId or invalid status" });
  }
  await db.query("UPDATE users SET status = $1 WHERE id = $2", [status, userId]);
  await audit(admin.id, status === "inactive" ? "deactivated" : "activated", "member", userId, null);
  res.json({ success: true });
}