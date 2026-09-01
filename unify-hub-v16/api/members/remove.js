import { db } from "hatchable";
import { requireAdmin, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

// Permanently deletes a member account. Only allowed for accounts that are
// already deactivated, as a safety rail against removing someone who's
// still active. Related rows (memberships, sessions, notifications, RSVPs)
// cascade; tasks/events/messages/announcements/files they created or
// uploaded are kept but their author reference is cleared.
export default async function (req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing member id" });
  if (id === admin.id) return res.status(400).json({ error: "You can't delete your own account" });

  const { rows } = await db.query("SELECT id, name, status FROM users WHERE id = $1", [id]);
  const target = rows[0];
  if (!target) return res.status(404).json({ error: "Member not found" });
  if (target.status !== "inactive") {
    return res.status(400).json({ error: "Deactivate this member before deleting them" });
  }

  await audit(admin.id, "deleted", "member", id, target.name);
  await db.query("DELETE FROM users WHERE id = $1", [id]);
  res.json({ success: true });
}