import sql from '../utils/sql.js';
import { auth } from '../../auth.js';

// Get all tasks for the current user
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let tasks;
    if (status) {
      tasks = await sql`
        SELECT t.*, s.name as subject_name, s.color as subject_color
        FROM tasks t
        LEFT JOIN subjects s ON t.subject_id = s.id
        WHERE t.user_id = ${userId} AND t.status = ${status}
        ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
      `;
    } else {
      tasks = await sql`
        SELECT t.*, s.name as subject_name, s.color as subject_color
        FROM tasks t
        LEFT JOIN subjects s ON t.subject_id = s.id
        WHERE t.user_id = ${userId}
        ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
      `;
    }

    return Response.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new task
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { title, description, due_date, subject_id, priority, status } = body;

    if (!title) {
      return Response.json(
        { error: "Task title is required" },
        { status: 400 },
      );
    }

    const task = await sql`
      INSERT INTO tasks (user_id, title, description, due_date, subject_id, priority, status)
      VALUES (
        ${userId}, 
        ${title}, 
        ${description || null}, 
        ${due_date || null}, 
        ${subject_id || null}, 
        ${priority || "medium"},
        ${status || "todo"}
      )
      RETURNING *
    `;

    // Create spaced repetition tasks (Day 3, 7, 14)
    if (due_date && !body.is_revision) {
      const originalTaskId = task[0].id;
      const dueDate = new Date(due_date);

      // Day 3 revision
      const day3 = new Date(dueDate);
      day3.setDate(day3.getDate() + 3);

      await sql`
        INSERT INTO tasks (user_id, title, description, due_date, subject_id, priority, status, is_revision, revision_number, original_task_id)
        VALUES (
          ${userId},
          ${"📝 Review: " + title},
          ${description || null},
          ${day3.toISOString().split("T")[0]},
          ${subject_id || null},
          ${priority || "medium"},
          'todo',
          true,
          1,
          ${originalTaskId}
        )
      `;

      // Day 7 revision
      const day7 = new Date(dueDate);
      day7.setDate(day7.getDate() + 7);

      await sql`
        INSERT INTO tasks (user_id, title, description, due_date, subject_id, priority, status, is_revision, revision_number, original_task_id)
        VALUES (
          ${userId},
          ${"📝 Review: " + title},
          ${description || null},
          ${day7.toISOString().split("T")[0]},
          ${subject_id || null},
          ${priority || "medium"},
          'todo',
          true,
          2,
          ${originalTaskId}
        )
      `;

      // Day 14 revision
      const day14 = new Date(dueDate);
      day14.setDate(day14.getDate() + 14);

      await sql`
        INSERT INTO tasks (user_id, title, description, due_date, subject_id, priority, status, is_revision, revision_number, original_task_id)
        VALUES (
          ${userId},
          ${"📝 Review: " + title},
          ${description || null},
          ${day14.toISOString().split("T")[0]},
          ${subject_id || null},
          ${priority || "medium"},
          'todo',
          true,
          3,
          ${originalTaskId}
        )
      `;
    }

    return Response.json({ task: task[0] });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update a task
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { id, title, description, due_date, subject_id, priority, status } =
      body;

    if (!id) {
      return Response.json({ error: "Task ID is required" }, { status: 400 });
    }

    const setClauses = [];
    const values = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      setClauses.push(`title = $${paramCount}`);
      values.push(title);
    }
    if (description !== undefined) {
      paramCount++;
      setClauses.push(`description = $${paramCount}`);
      values.push(description);
    }
    if (due_date !== undefined) {
      paramCount++;
      setClauses.push(`due_date = $${paramCount}`);
      values.push(due_date);
    }
    if (subject_id !== undefined) {
      paramCount++;
      setClauses.push(`subject_id = $${paramCount}`);
      values.push(subject_id);
    }
    if (priority !== undefined) {
      paramCount++;
      setClauses.push(`priority = $${paramCount}`);
      values.push(priority);
    }
    if (status !== undefined) {
      paramCount++;
      setClauses.push(`status = $${paramCount}`);
      values.push(status);

      // If status is completed, set completed_at
      if (status === "completed") {
        paramCount++;
        setClauses.push(`completed_at = NOW()`);
      }
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    paramCount++;
    const whereClause = `WHERE id = $${paramCount} AND user_id = $${paramCount + 1}`;
    values.push(id, userId);

    const query = `UPDATE tasks SET ${setClauses.join(", ")} ${whereClause} RETURNING *`;
    const task = await sql(query, values);

    if (task.length === 0) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    return Response.json({ task: task[0] });
  } catch (error) {
    console.error("PUT /api/tasks error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a task
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
      return Response.json({ error: "Task ID is required" }, { status: 400 });
    }

    const deleted = await sql`
      DELETE FROM tasks 
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
