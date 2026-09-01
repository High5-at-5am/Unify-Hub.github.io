import { db, storage } from "hatchable";
import { requireUser, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const teamId = req.body?.teamId;
  const file = (req.files || [])[0];
  if (!teamId) return res.status(400).json({ error: "Missing teamId" });
  if (!file) return res.status(400).json({ error: "No file uploaded" });
  if (file.buffer.length > 10 * 1024 * 1024) return res.status(400).json({ error: "Files must be smaller than 10 MB" });
  if (user.role !== "admin") {
    const { rows: mem } = await db.query("SELECT 1 FROM memberships WHERE user_id = $1 AND team_id = $2", [user.id, teamId]);
    if (!mem.length) return res.status(403).json({ error: "Not a member of that team" });
  }
  const key = `teams/${teamId}/${user.id}/${Date.now()}-${file.filename}`;
  const url = await storage.put(key, file.buffer, file.contentType);
  const { rows } = await db.query(
    `INSERT INTO team_files (team_id, uploaded_by_id, file_name, file_key, file_url, mime_type, file_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [teamId, user.id, file.filename, key, url, file.contentType, file.buffer.length]
  );
  await audit(user.id, "uploaded", "team_file", rows[0].id, file.filename);
  res.json({ key, url });
}