import { db } from "hatchable";

const ITERATIONS = 100000;
const SESSION_DAYS = 30;

function toHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}
function fromHex(hex) {
  return new Uint8Array(Buffer.from(hex, "hex"));
}
function randomBytesHex(len) {
  return toHex(crypto.getRandomValues(new Uint8Array(len)));
}

// Stored as "salt:derivedKeyHex" (PBKDF2-SHA256), matching the shape of the
// original scrypt-based password.ts but using WebCrypto (scrypt isn't
// available in the isolate).
export async function hashPassword(password) {
  const salt = randomBytesHex(16);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(salt), iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${salt}:${toHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(salt), iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const derived = toHex(new Uint8Array(bits));
  if (derived.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived.charCodeAt(i) ^ key.charCodeAt(i);
  return diff === 0;
}

export function generateTemporaryPassword() {
  return randomBytesHex(12);
}

function randomToken() {
  return randomBytesHex(32);
}

export async function createSession(userId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)", [token, userId, expires.toISOString()]);
  return { token, expires };
}

function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

export function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader("Set-Cookie", `uh_session=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "uh_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
}

export async function getCurrentUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.uh_session;
  if (!token) return null;
  const { rows } = await db.query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now() AND u.status = 'active'`,
    [token]
  );
  return rows[0] || null;
}

export async function requireUser(req, res) {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return null;
  }
  return user;
}

export async function requireAdmin(req, res) {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return null;
  }
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admins only" });
    return null;
  }
  return user;
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    role: u.role,
    memberId: u.member_id,
    phone: u.phone,
    profileImageUrl: u.profile_image_url,
    status: u.status,
    mustResetPassword: u.must_reset_password,
    createdAt: u.created_at,
  };
}

export async function audit(actorId, action, entityType, entityId, details) {
  await db.query(
    "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
    [actorId, action, entityType, entityId ? String(entityId) : null, details || null]
  );
}