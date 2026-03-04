import sql from '../utils/sql.js';

export async function GET() {
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
        return Response.json({ success: true, message: "push_subscriptions table created successfully" });
    } catch (error) {
        console.error("Setup DB error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
