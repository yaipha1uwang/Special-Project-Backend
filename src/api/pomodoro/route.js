import sql from '../utils/sql.js';
import { auth } from '../../auth.js';

// Get pomodoro sessions
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary");

    // Get daily summary (today's stats)
    if (summary === "daily") {
      const tzOffset = parseInt(searchParams.get("tz") || "0"); // Offset in minutes
      const dailyStats = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE completed = true) as sessions_completed,
          COALESCE(SUM(duration_minutes) FILTER (WHERE completed = true), 0) as total_focus_minutes
        FROM pomodoro_sessions
        WHERE user_id = ${userId}
          AND (completed_at - interval '1 minute' * ${tzOffset})::date = (CURRENT_TIMESTAMP - interval '1 minute' * ${tzOffset})::date
      `;

      return Response.json({
        sessions_completed: Number(dailyStats[0]?.sessions_completed) || 0,
        total_focus_minutes: Number(dailyStats[0]?.total_focus_minutes) || 0,
      });
    }

    // Get weekly summary (last 7 days)
    if (summary === "weekly") {
      const tzOffset = parseInt(searchParams.get("tz") || "0"); // Offset in minutes
      const weeklyStats = await sql`
        SELECT 
          TO_CHAR((completed_at - interval '1 minute' * ${tzOffset})::date, 'YYYY-MM-DD') as date,
          COUNT(*) as sessions,
          SUM(duration_minutes) as total_minutes
        FROM pomodoro_sessions
        WHERE user_id = ${userId}
          AND completed = true
          AND (completed_at - interval '1 minute' * ${tzOffset})::date >= (CURRENT_TIMESTAMP - interval '1 minute' * ${tzOffset})::date - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY date ASC
      `;

      return Response.json({ weeklyStats });
    }

    // Get recent sessions list (default behavior)
    const limit = searchParams.get("limit") || 10;

    const sessions = await sql`
      SELECT p.*, s.name as subject_name, t.title as task_title
      FROM pomodoro_sessions p
      LEFT JOIN subjects s ON p.subject_id = s.id
      LEFT JOIN tasks t ON p.task_id = t.id
      WHERE p.user_id = ${userId}
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `;

    return Response.json({ sessions });
  } catch (error) {
    console.error("GET /api/pomodoro error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a pomodoro session
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { task_id, subject_id, duration_minutes, completed } = body;

    const pomodoroSession = await sql`
      INSERT INTO pomodoro_sessions (user_id, task_id, subject_id, duration_minutes, completed, completed_at)
      VALUES (
        ${userId},
        ${task_id || null},
        ${subject_id || null},
        ${duration_minutes || 25},
        ${completed || false},
        ${completed ? new Date().toISOString() : null}
      )
      RETURNING *
    `;

    return Response.json({ session: pomodoroSession[0] });
  } catch (error) {
    console.error("POST /api/pomodoro error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update a pomodoro session
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { id, completed } = body;

    if (!id) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    const updated = await sql`
      UPDATE pomodoro_sessions
      SET completed = ${completed},
          completed_at = ${completed ? new Date().toISOString() : null}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (updated.length === 0) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json({ session: updated[0] });
  } catch (error) {
    console.error("PUT /api/pomodoro error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
