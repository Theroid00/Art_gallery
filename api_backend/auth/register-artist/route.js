import { db } from "@/lib/db";

const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/;

export async function POST(req) {
  try {
    const { name, username, email, biography, country, profile_image } = await req.json();

    if (!name || !email || !username) {
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

    // Insert into users
    const [userResult] = await db.query(
      "INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, 'none', 'artist')",
      [name, username, email]
    );
    const newUserId = userResult.insertId;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    // Insert into artists
    const [artistResult] = await db.query(
      "INSERT INTO artists (user_id, biography, country, profile_image, name, slug) VALUES (?, ?, ?, ?, ?, ?)",
      [newUserId, biography || "", country || "", profile_image || "", name, slug]
    );

    return Response.json({ 
      message: "Artist registered successfully", 
      artist_id: artistResult.insertId,
      slug: slug
    });

  } catch (error) {
    console.error("Register Error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
