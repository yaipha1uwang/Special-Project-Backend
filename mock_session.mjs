import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function injectSession() {
    try {
        const users = await sql`SELECT id FROM auth_users LIMIT 1`;
        if (!users || users.length === 0) {
            console.log("No users in DB, creating a mock one...");
            const newU = await sql`INSERT INTO auth_users (name, email) VALUES ('Test', 'test@example.com') RETURNING id`;
            await sql`INSERT INTO auth_sessions ("userId", expires, "sessionToken") VALUES (${newU[0].id}, NOW() + INTERVAL '1 day', 'mocked-test-token')`;
        } else {
            await sql`INSERT INTO auth_sessions ("userId", expires, "sessionToken") VALUES (${users[0].id}, NOW() + INTERVAL '1 day', 'mocked-test-token') ON CONFLICT DO NOTHING`;
        }
        console.log("Session injected successfully!");
    } catch (e) {
        console.error("Injection failed:", e);
    }
}

injectSession();
