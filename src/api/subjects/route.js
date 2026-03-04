import sql from '../utils/sql.js';
import { auth } from '../../auth.js';

// Get all subjects for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get subjects with task counts
    const subjects = await sql`
      SELECT 
        s.*,
        COUNT(CASE WHEN t.status != 'completed' THEN 1 END)::int as pending_tasks_count,
        COUNT(t.id)::int as total_tasks_count
      FROM subjects s
      LEFT JOIN tasks t ON t.subject_id = s.id
      WHERE s.user_id = ${userId}
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `;

    return Response.json({ subjects });
  } catch (error) {
    console.error("GET /api/subjects error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new subject
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, exam_date, weak_areas, color, is_weak, topics } = body;

    if (!name) {
      return Response.json(
        { error: "Subject name is required" },
        { status: 400 },
      );
    }

    // Check for duplicate subject names
    const existing = await sql`
      SELECT id FROM subjects 
      WHERE user_id = ${userId} AND LOWER(name) = LOWER(${name})
    `;

    if (existing.length > 0) {
      return Response.json(
        { error: "A subject with this name already exists" },
        { status: 400 },
      );
    }

    // Store topics as JSON if provided
    const topicsData = topics ? JSON.stringify(topics) : weak_areas;

    const subject = await sql`
      INSERT INTO subjects (user_id, name, exam_date, weak_areas, color, is_weak)
      VALUES (
        ${userId}, 
        ${name}, 
        ${exam_date || null}, 
        ${topicsData || null}, 
        ${color || "#8B70F6"},
        ${is_weak || false}
      )
      RETURNING *
    `;

    return Response.json({ subject: subject[0] });
  } catch (error) {
    console.error("POST /api/subjects error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update a subject
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { id, name, exam_date, weak_areas, color, is_weak, topics } = body;

    if (!id) {
      return Response.json(
        { error: "Subject ID is required" },
        { status: 400 },
      );
    }

    // Check for duplicate subject names (excluding current subject)
    if (name !== undefined) {
      const existing = await sql`
        SELECT id FROM subjects 
        WHERE user_id = ${userId} 
        AND LOWER(name) = LOWER(${name})
        AND id != ${id}
      `;

      if (existing.length > 0) {
        return Response.json(
          { error: "A subject with this name already exists" },
          { status: 400 },
        );
      }
    }

    const setClauses = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      setClauses.push(`name = $${paramCount}`);
      values.push(name);
    }
    if (exam_date !== undefined) {
      paramCount++;
      setClauses.push(`exam_date = $${paramCount}`);
      values.push(exam_date);
    }
    if (topics !== undefined) {
      paramCount++;
      setClauses.push(`weak_areas = $${paramCount}`);
      values.push(JSON.stringify(topics));
    } else if (weak_areas !== undefined) {
      paramCount++;
      setClauses.push(`weak_areas = $${paramCount}`);
      values.push(weak_areas);
    }
    if (color !== undefined) {
      paramCount++;
      setClauses.push(`color = $${paramCount}`);
      values.push(color);
    }
    if (is_weak !== undefined) {
      paramCount++;
      setClauses.push(`is_weak = $${paramCount}`);
      values.push(is_weak);
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    paramCount++;
    setClauses.push(`updated_at = NOW()`);
    const whereClause = `WHERE id = $${paramCount} AND user_id = $${paramCount + 1}`;
    values.push(id, userId);

    const query = `UPDATE subjects SET ${setClauses.join(", ")} ${whereClause} RETURNING *`;
    const subject = await sql(query, values);

    if (subject.length === 0) {
      return Response.json({ error: "Subject not found" }, { status: 404 });
    }

    return Response.json({ subject: subject[0] });
  } catch (error) {
    console.error("PUT /api/subjects error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a subject
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "Subject ID is required" },
        { status: 400 },
      );
    }

    const deleted = await sql`
      DELETE FROM subjects 
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return Response.json({ error: "Subject not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/subjects error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
