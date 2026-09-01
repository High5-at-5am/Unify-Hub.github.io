import { db, storage } from "hatchable";
import { requireUser, audit } from "lib/auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const file = (req.files || [])[0];
  if (!file) return res.status(400).json({ error: "No file uploaded" });
  if (!/^image\//.test(file.contentType)) return res.status(400).json({ error: "Profile pictures must be an image" });
  if (file.buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: "Profile pictures must be smaller than 5 MB" });
  const url = await storage.put(`profiles/${user.id}/avatar`, file.buffer, file.contentType);
  await db.query("UPDATE users SET profile_image_url = $1, updated_at = now() WHERE id = $2", [url, user.id]);
  await audit(user.id, "updated_avatar", "profile", user.id, null);
  res.json({ url });
}