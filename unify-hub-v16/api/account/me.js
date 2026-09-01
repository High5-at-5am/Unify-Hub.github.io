import { getCurrentUser, publicUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const user = await getCurrentUser(req);
  res.json({ user: publicUser(user) });
}