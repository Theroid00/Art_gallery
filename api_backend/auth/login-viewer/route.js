import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Query for standard users and admins (not artists)
    const [users] = await db.query("SELECT * FROM users WHERE email = ? AND role IN ('user', 'admin')", [email]);
    
    if (users.length === 0) {
      return Response.json({ error: "Invalid email or you might be registered as an Artist. Please use the Artist Portal." }, { status: 401 });
    }

    const user = users[0];
    
    return Response.json({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      is_admin: user.role === "admin"
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
