import { db } from "@/lib/db";

const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/;

export async function POST(req) {
  try {
    const { name, username, email } = await req.json();

    if (!name || !username || !email) {
      return Response.json({ error: "Name, username, and email are required" }, { status: 400 });
    }

    // Validate username format
    if (!USERNAME_REGEX.test(username)) {
      return Response.json({
        error: "Username must be 3-30 characters and can only contain lowercase letters, numbers, underscores (_) and dots (.)"
      }, { status: 400 });
    }

    // Check username uniqueness
    const [existingUsername] = await db.query("SELECT user_id FROM users WHERE username = ?", [username]);
    if (existingUsername.length > 0) {
      return Response.json({ error: "Username already taken. Please choose another." }, { status: 400 });
    }

    // Check if email already exists
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return Response.json({ error: "Email already registered." }, { status: 400 });
    }

    // Insert user into `users` table as 'user' role
    const [result] = await db.query(
      "INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, 'user')",
      [name, username, email, "passwordless_hash_" + Date.now()]
    );

    return Response.json({ message: "Registration successful" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
