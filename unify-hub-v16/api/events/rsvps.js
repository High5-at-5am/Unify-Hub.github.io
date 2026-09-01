import { db } from "hatchable";
import { requireUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const eventId = req.query.eventId;
  if (!eventId) return res.status(400).json({ error: "Missing eventId" });
  const { rows } = await db.query(
    `SELECT r.status, u.name, u.member_id FROM event_rsvps r JOIN users u ON u.id = r.user_id WHERE r.event_id = $1 ORDER BY u.name`,
    [eventId]
  );
  res.json({ rsvps: rows });
}