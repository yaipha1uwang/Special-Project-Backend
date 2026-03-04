import sql from '../../utils/sql.js';
import { auth } from '../../../auth.js';

// Get admin statistics
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total users
    const totalUsers = await sql`
      SELECT COUNT(*) as count FROM auth_users
    `;

    // Get total subjects
    const totalSubjects = await sql`
      SELECT COUNT(*) as count FROM subjects
    `;

    // Get total tasks
    const totalTasks = await sql`
      SELECT COUNT(*) as count FROM tasks
    `;

    // Get total pomodoro sessions
    const totalSessions = await sql`
      SELECT COUNT(*) as count FROM pomodoro_sessions WHERE completed = true
    `;

    // Get recent activity
    const recentActivity = await sql`
      SELECT 
        u.email,
        COUNT(t.id) as task_count,
        COUNT(p.id) as session_count,
        MAX(p.completed_at) as last_activity
      FROM auth_users u
      LEFT JOIN tasks t ON u.id = t.user_id
      LEFT JOIN pomodoro_sessions p ON u.id = p.user_id
      GROUP BY u.id, u.email
      ORDER BY last_activity DESC NULLS LAST
      LIMIT 10
    `;

    return Response.json({
      totalUsers: totalUsers[0].count,
      totalSubjects: totalSubjects[0].count,
      totalTasks: totalTasks[0].count,
      totalSessions: totalSessions[0].count,
      recentActivity,
    });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
