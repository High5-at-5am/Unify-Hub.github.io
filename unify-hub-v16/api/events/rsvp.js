import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

const VALID = ["going", "maybe", "declined"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { eventId, status } = req.body || {};
  if (!eventId || !VALID.includes(status)) return res.status(400).json({ error: "Invalid RSVP" });
  await db.query(
    `INSERT INTO event_rsvps (event_id, user_id, status) VALUES ($1, $2, $3)
     ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
    [eventId, user.id, status]
  );
  res.json({ success: true });
}