import sql from '../../utils/sql.js';
import { auth } from '../../../auth.js';

// Delete all chat history for the user
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete records
    const deleted = await sql`
      DELETE FROM chat_messages 
      WHERE user_id = ${userId}
      RETURNING id
    `;

    // Log the action
    await sql`
      INSERT INTO audit_logs (user_id, action, details) 
      VALUES (${userId}, 'CHAT_HISTORY_CLEARED', ${JSON.stringify({ deleted_count: deleted.length })})
    `;

    return Response.json({ success: true, count: deleted.length });
  } catch (error) {
    console.error("DELETE /api/chat/history error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
