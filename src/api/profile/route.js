import sql from '../utils/sql.js';
import { auth } from '../../auth.js';

// Get user profile with preferences
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user data from auth_users
    const [user] = await sql`
      SELECT id, name, email, image
      FROM auth_users
      WHERE id = ${userId}
    `;

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch or create user profile
    let [profile] = await sql`
      SELECT * FROM user_profiles
      WHERE user_id = ${userId}
    `;

    // Create profile if it doesn't exist
    if (!profile) {
      [profile] = await sql`
        INSERT INTO user_profiles (user_id)
        VALUES (${userId})
        RETURNING *
      `;
    }

    // Fetch user's subjects for weak subjects selection
    const subjects = await sql`
      SELECT id, name, is_weak
      FROM subjects
      WHERE user_id = ${userId}
      ORDER BY name ASC
    `;

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      profile: {
        daily_study_hours: profile.daily_study_hours,
        preferred_study_time: profile.preferred_study_time,
        weak_subjects: profile.weak_subjects || [],
        notification_preferences: profile.notification_preferences || {
          email_reminders: true,
          daily_study_reminder: true,
          exam_reminder_alerts: true,
        },
        theme_preference: profile.theme_preference || "light",
        enable_spaced_repetition: profile.enable_spaced_repetition ?? true,
        enable_ai_optimization: profile.enable_ai_optimization ?? true,
        role: profile.role,
        is_super_admin: profile.is_super_admin,
        updated_at: profile.updated_at,
      },
      subjects,
    });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update user profile (name only - WHITELISTED)
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // SECURITY: Only allow updating name field
    // Explicitly ignore any attempts to modify:
    // - role, is_super_admin, suspended, is_deleted
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    if (name.length > 255) {
      return Response.json(
        { error: "Name must be 255 characters or less" },
        { status: 400 },
      );
    }

    // Update only the name field in auth_users table
    const [updated] = await sql`
      UPDATE auth_users
      SET name = ${name.trim()}
      WHERE id = ${userId}
      RETURNING id, name, email
    `;

    if (!updated) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Update the updated_at timestamp in user_profiles
    await sql`
      UPDATE user_profiles
      SET updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    return Response.json({
      success: true,
      user: updated,
    });
  } catch (error) {
    console.error("PUT /api/profile error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Soft delete user account
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user is a super admin
    const [profile] = await sql`
      SELECT is_super_admin FROM user_profiles
      WHERE user_id = ${userId}
    `;

    // If super admin, check if they're the last one
    if (profile?.is_super_admin) {
      const [{ count }] = await sql`
        SELECT COUNT(*) as count
        FROM user_profiles
        WHERE is_super_admin = true
          AND is_deleted = false
          AND suspended = false
      `;

      if (Number(count) <= 1) {
        return Response.json(
          { error: "Cannot delete the last super admin" },
          { status: 403 },
        );
      }
    }

    // Soft delete: Set is_deleted and suspended flags
    await sql`
      UPDATE user_profiles
      SET is_deleted = true,
          suspended = true,
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    // Get request metadata for audit log
    const headers = request.headers;
    const userAgent = headers.get("user-agent") || "Unknown";
    const ipAddress =
      headers.get("x-forwarded-for") || headers.get("x-real-ip") || "Unknown";

    // Log the deletion in audit_logs
    await sql`
      INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
      VALUES (
        ${userId},
        'account_deletion',
        ${JSON.stringify({
          method: "soft_delete",
          timestamp: new Date().toISOString(),
        })},
        ${ipAddress},
        ${userAgent}
      )
    `;

    return Response.json({
      success: true,
      message: "Account has been deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create or update user profile (legacy POST endpoint for onboarding)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { daily_study_hours, onboarding_completed } = body;

    // Check if profile exists
    const existing = await sql`
      SELECT id FROM user_profiles WHERE user_id = ${userId}
    `;

    let profile;
    if (existing.length > 0) {
      // Update existing profile
      profile = await sql`
        UPDATE user_profiles 
        SET daily_study_hours = ${daily_study_hours || 2},
            onboarding_completed = ${onboarding_completed !== undefined ? onboarding_completed : false},
            updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING *
      `;
    } else {
      // Create new profile
      profile = await sql`
        INSERT INTO user_profiles (user_id, daily_study_hours, onboarding_completed)
        VALUES (${userId}, ${daily_study_hours || 2}, ${onboarding_completed !== undefined ? onboarding_completed : false})
        RETURNING *
      `;
    }

    return Response.json({ profile: profile[0] });
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
