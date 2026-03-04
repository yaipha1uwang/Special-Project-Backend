import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL);

async function run() {
    try {
        const tzOffset = Number(process.argv[2] || -330);

        // Test Daily Query
        const dailyStats = await sql`
      SELECT 
        user_id,
        completed_at,
        (completed_at - interval '1 minute' * ${tzOffset}) as my_shifted_timestamp,
        (completed_at - interval '1 minute' * ${tzOffset})::date as my_date,
        CURRENT_TIMESTAMP as now_timestamp,
        (CURRENT_TIMESTAMP - interval '1 minute' * ${tzOffset})::date as today_date
      FROM pomodoro_sessions
      ORDER BY completed_at DESC
      LIMIT 1
    `;

        const weeklyStats = await sql`
        SELECT 
          (completed_at - interval '1 minute' * ${tzOffset})::date as date,
          COUNT(*) as sessions,
          SUM(duration_minutes) as total_minutes
        FROM pomodoro_sessions
        WHERE completed = true
          AND (completed_at - interval '1 minute' * ${tzOffset})::date >= (CURRENT_TIMESTAMP - interval '1 minute' * ${tzOffset})::date - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY date ASC
      `;

        fs.writeFileSync('test_db_output.json', JSON.stringify({ dailyStats, weeklyStats }, null, 2));

    } catch (e) {
        console.error(e);
    }
}

run();
