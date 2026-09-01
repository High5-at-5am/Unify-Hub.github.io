import { db } from "hatchable";
import { getCurrentUser } from "lib/auth.js";

export const access = "public";
export const methods = ["GET"];

// Branding info (org name + colors) -- readable without being signed in
// (the login page uses it too). If the caller IS signed in, also returns
// their personal color override, if they've set one.
export default async function (req, res) {
  const { rows: orgRows } = await db.query("SELECT name, primary_color FROM organization_settings LIMIT 1");
  const { rows: teams } = await db.query("SELECT id, name, color FROM teams ORDER BY name");
  const org = orgRows[0] || { name: "Unify Hub", primary_color: "#f06b4e" };

  let personalPrimaryColor = null;
  const user = await getCurrentUser(req);
  if (user) personalPrimaryColor = user.custom_primary_color || null;

  res.json({
    orgName: org.name,
    primaryColor: org.primary_color,
    personalPrimaryColor,
    teams,
  });
}