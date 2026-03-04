import sql from '../utils/sql.js';
import { auth } from '../../auth.js';

// Get analytics data
export async function GET() {
  console.log("Analytics GET called!");
  try {
    const session = await auth();
    console.log("Analytics session:", !!session?.user?.id);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get task completion stats including overdue
    const taskStats = await sql`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'todo') as todo_tasks,
        COUNT(*) FILTER (WHERE status != 'completed' AND due_date < CURRENT_DATE) as overdue_tasks
      FROM tasks
      WHERE user_id = ${userId}
    `;

    // Get study hours by subject
    const studyHoursBySubject = await sql`
      SELECT 
        s.name as subject_name,
        s.color as subject_color,
        COUNT(p.id) as session_count,
        COALESCE(SUM(p.duration_minutes), 0) as total_minutes
      FROM subjects s
      LEFT JOIN pomodoro_sessions p ON s.id = p.subject_id AND p.user_id = ${userId} AND p.completed = true
      WHERE s.user_id = ${userId}
      GROUP BY s.id, s.name, s.color
      ORDER BY total_minutes DESC
    `;

    // Get weekly activity (last 7 days) - will fill missing days on frontend
    const weeklyActivity = await sql`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as sessions,
        SUM(duration_minutes) as total_minutes
      FROM pomodoro_sessions
      WHERE user_id = ${userId} 
        AND completed = true 
        AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `;

    // Get 1-year activity for heatmap
    const monthlyActivity = await sql`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as sessions,
        SUM(duration_minutes) as total_minutes
      FROM pomodoro_sessions
      WHERE user_id = ${userId} 
        AND completed = true 
        AND completed_at >= CURRENT_DATE - INTERVAL '1 year'
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `;

    // Calculate study streaks based on completed sessions
    const streakData = await sql`
      WITH daily_activity AS (
        SELECT DISTINCT DATE(completed_at) as activity_date
        FROM pomodoro_sessions
        WHERE user_id = ${userId} AND completed = true
        ORDER BY activity_date DESC
      ),
      date_series AS (
        SELECT activity_date,
               activity_date - LAG(activity_date) OVER (ORDER BY activity_date) as gap
        FROM daily_activity
      ),
      streak_groups AS (
        SELECT activity_date,
               SUM(CASE WHEN gap IS NULL OR gap = 1 THEN 0 ELSE 1 END) 
                 OVER (ORDER BY activity_date) as streak_group
        FROM date_series
      )
      SELECT 
        COUNT(*) as streak_length,
        MIN(activity_date) as streak_start,
        MAX(activity_date) as streak_end
      FROM streak_groups
      GROUP BY streak_group
      ORDER BY streak_length DESC
      LIMIT 1
    `;

    // Check if current streak is active (studied today or yesterday)
    const currentStreakCheck = await sql`
      SELECT DISTINCT DATE(completed_at) as last_study_date
      FROM pomodoro_sessions
      WHERE user_id = ${userId} AND completed = true
      ORDER BY last_study_date DESC
      LIMIT 1
    `;

    let currentStreak = 0;
    let longestStreak = 0;

    if (streakData.length > 0) {
      const lastStudyDate = currentStreakCheck[0]?.last_study_date;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastStudyDate) {
        const lastDate = new Date(lastStudyDate);
        lastDate.setHours(0, 0, 0, 0);

        // Current streak is active if studied today or yesterday
        if (lastDate >= yesterday) {
          currentStreak = streakData[0].streak_length || 0;
        }
      }

      longestStreak = streakData[0].streak_length || 0;
    }

    // Get upcoming deadlines
    const upcomingDeadlines = await sql`
      SELECT 
        t.title,
        t.due_date,
        s.name as subject_name,
        s.color as subject_color
      FROM tasks t
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE t.user_id = ${userId} 
        AND t.status != 'completed'
        AND t.due_date IS NOT NULL
        AND t.due_date >= CURRENT_DATE
      ORDER BY t.due_date ASC
      LIMIT 5
    `;

    // Get total study time
    const totalStudyTime = await sql`
      SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
      FROM pomodoro_sessions
      WHERE user_id = ${userId} AND completed = true
    `;

    return Response.json({
      taskStats: taskStats[0],
      studyHoursBySubject,
      weeklyActivity,
      monthlyActivity,
      studyStreak: {
        current: currentStreak,
        longest: longestStreak,
      },
      upcomingDeadlines,
      totalStudyTime: totalStudyTime[0],
    });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Track an analytics event
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { event_type, event_data } = body;

    if (!event_type) {
      return Response.json(
        { error: "Event type is required" },
        { status: 400 },
      );
    }

    await sql`
      INSERT INTO analytics_events (user_id, event_type, event_data)
      VALUES (${userId}, ${event_type}, ${JSON.stringify(event_data || {})})
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("POST /api/analytics error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
