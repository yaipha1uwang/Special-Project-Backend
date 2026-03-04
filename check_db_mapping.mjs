import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config();

const sql = neon(process.env.DATABASE_URL);

async function checkDatabaseMapping() {
    console.log("🔍 Fetching data for Test User (testuser_cogniX_2@test.com)...\n");

    try {
        // 1. Find User
        const users = await sql`SELECT id, name, email FROM auth_users WHERE email = 'testuser_cogniX_2@test.com'`;
        if (users.length === 0) {
            console.log("❌ Test User not found.");
            return;
        }
        const user = users[0];
        console.log(`👤 USER RECORD (auth_users):`);
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Name: ${user.name}`);
        console.log(`   - Email: ${user.email}\n`);

        // 2. Fetch Subjects
        const subjects = await sql`SELECT id, name, color, is_weak FROM subjects WHERE user_id = ${user.id}`;
        console.log(`📚 SUBJECTS (${subjects.length}):`);
        subjects.forEach(s => {
            console.log(`   - [${s.id}] ${s.name} (Color: ${s.color}, Weak: ${s.is_weak})`);
        });
        console.log("");

        // 3. Fetch Tasks (Grouped by status)
        const tasks = await sql`
      SELECT t.id, t.title, t.status, s.name as subject_name 
      FROM tasks t 
      LEFT JOIN subjects s ON t.subject_id = s.id 
      WHERE t.user_id = ${user.id}
    `;
        console.log(`✅ TASKS (${tasks.length}):`);
        const tasksByStatus = tasks.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {});
        console.log(`   - Summary: ${JSON.stringify(tasksByStatus)}`);
        console.log(`   - Sample (First 3):`);
        tasks.slice(0, 3).forEach(t => {
            console.log(`     * [${t.status.toUpperCase()}] ${t.title} (${t.subject_name})`);
        });
        console.log("");

        // 4. Fetch Pomodoro Sessions
        const sessions = await sql`
      SELECT p.id, p.duration_minutes, p.completed_at, s.name as subject_name 
      FROM pomodoro_sessions p
      LEFT JOIN subjects s ON p.subject_id = s.id
      WHERE p.user_id = ${user.id}
      ORDER BY p.completed_at DESC
      LIMIT 5
    `;
        const totalSessions = await sql`SELECT COUNT(*) as count FROM pomodoro_sessions WHERE user_id = ${user.id}`;
        console.log(`⏱️  POMODORO SESSIONS (Total: ${totalSessions[0].count}):`);
        console.log(`   - Most recent 5 sessions:`);
        sessions.forEach(s => {
            const dateStr = s.completed_at ? new Date(s.completed_at).toLocaleString() : 'N/A';
            console.log(`     * ${s.duration_minutes} mins on ${s.subject_name} (Completed: ${dateStr})`);
        });
        console.log("");

        // 5. Fetch Chat Messages
        const chats = await sql`
      SELECT role, message, created_at 
      FROM chat_messages 
      WHERE user_id = ${user.id} 
      ORDER BY created_at DESC 
      LIMIT 3
    `;
        const totalChats = await sql`SELECT COUNT(*) as count FROM chat_messages WHERE user_id = ${user.id}`;
        console.log(`🤖 AI CHAT MESSAGES (Total: ${totalChats[0].count}):`);
        if (chats.length === 0) {
            console.log(`   - No chat messages found for this user yet.`);
        } else {
            console.log(`   - Most recent 3 messages:`);
            chats.reverse().forEach(c => {
                const preview = c.message.length > 50 ? c.message.substring(0, 50) + "..." : c.message;
                console.log(`     * [${c.role.toUpperCase()}] ${preview}`);
            });
        }

    } catch (error) {
        console.error("Error querying database:", error);
    } finally {
        process.exit(0);
    }
}

checkDatabaseMapping();
