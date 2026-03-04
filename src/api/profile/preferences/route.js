import sql from '../../utils/sql.js';
import { auth } from '../../../auth.js';

// Update user preferences with validation and optimistic concurrency control
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      daily_study_hours,
      preferred_study_time,
      weak_subjects,
      notification_preferences,
      theme_preference,
      enable_spaced_repetition,
      enable_ai_optimization,
      updated_at, // For optimistic concurrency control
    } = body;

    // Validate daily_study_hours
    if (daily_study_hours !== undefined) {
      if (
        typeof daily_study_hours !== "number" ||
        daily_study_hours < 1 ||
        daily_study_hours > 12
      ) {
        return Response.json(
          { error: "Daily study hours must be between 1 and 12" },
          { status: 400 },
        );
      }
    }

    // Validate preferred_study_time
    if (preferred_study_time !== undefined) {
      const validTimes = ["morning", "afternoon", "evening", "night"];
      if (!validTimes.includes(preferred_study_time)) {
        return Response.json(
          { error: "Invalid preferred study time" },
          { status: 400 },
        );
      }
    }

    // Validate weak_subjects - ensure all subjects exist and belong to user
    if (
      weak_subjects !== undefined &&
      Array.isArray(weak_subjects) &&
      weak_subjects.length > 0
    ) {
      const subjectIds = weak_subjects
        .map((id) => Number(id))
        .filter((id) => !isNaN(id));

      const validSubjects = await sql`
        SELECT id FROM subjects
        WHERE user_id = ${userId}
          AND id = ANY(${subjectIds})
      `;

      if (validSubjects.length !== subjectIds.length) {
        return Response.json(
          {
            error: "One or more subjects do not exist or do not belong to you",
          },
          { status: 400 },
        );
      }
    }

    // Validate theme_preference
    if (theme_preference !== undefined) {
      const validThemes = ["light", "dark", "system"];
      if (!validThemes.includes(theme_preference)) {
        return Response.json(
          { error: "Invalid theme preference" },
          { status: 400 },
        );
      }
    }

    // Get current profile for optimistic concurrency control
    const [currentProfile] = await sql`
      SELECT updated_at FROM user_profiles
      WHERE user_id = ${userId}
    `;

    if (!currentProfile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check for concurrent updates
    if (updated_at) {
      const clientUpdatedAt = new Date(updated_at).getTime();
      const serverUpdatedAt = new Date(currentProfile.updated_at).getTime();

      if (clientUpdatedAt < serverUpdatedAt) {
        return Response.json(
          {
            error:
              "Profile has been updated by another session. Please refresh and try again.",
          },
          { status: 409 },
        );
      }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (daily_study_hours !== undefined) {
      updates.push(`daily_study_hours = $${paramIndex++}`);
      values.push(daily_study_hours);
    }

    if (preferred_study_time !== undefined) {
      updates.push(`preferred_study_time = $${paramIndex++}`);
      values.push(preferred_study_time);
    }

    if (weak_subjects !== undefined) {
      updates.push(`weak_subjects = $${paramIndex++}`);
      values.push(JSON.stringify(weak_subjects || []));
    }

    if (notification_preferences !== undefined) {
      updates.push(`notification_preferences = $${paramIndex++}`);
      values.push(JSON.stringify(notification_preferences));
    }

    if (theme_preference !== undefined) {
      updates.push(`theme_preference = $${paramIndex++}`);
      values.push(theme_preference);
    }

    if (enable_spaced_repetition !== undefined) {
      updates.push(`enable_spaced_repetition = $${paramIndex++}`);
      values.push(enable_spaced_repetition);
    }

    if (enable_ai_optimization !== undefined) {
      updates.push(`enable_ai_optimization = $${paramIndex++}`);
      values.push(enable_ai_optimization);
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at was included
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Add userId to values
    values.push(userId);

    // Execute update using function form
    const query = `
      UPDATE user_profiles
      SET ${updates.join(", ")}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const [updatedProfile] = await sql(query, values);

    if (!updatedProfile) {
      return Response.json(
        { error: "Failed to update profile" },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      profile: {
        daily_study_hours: updatedProfile.daily_study_hours,
        preferred_study_time: updatedProfile.preferred_study_time,
        weak_subjects: updatedProfile.weak_subjects || [],
        notification_preferences: updatedProfile.notification_preferences,
        theme_preference: updatedProfile.theme_preference,
        enable_spaced_repetition: updatedProfile.enable_spaced_repetition,
        enable_ai_optimization: updatedProfile.enable_ai_optimization,
        updated_at: updatedProfile.updated_at,
      },
    });
  } catch (error) {
    console.error("PUT /api/profile/preferences error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
