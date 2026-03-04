import sql from '../../utils/sql.js';
import { auth } from '../../../auth.js';

// Creates or updates a browser PushSubscription for a user
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();

        const { endpoint, keys } = body;
        const { p256dh, auth: authKey } = keys || {};

        if (!endpoint || !p256dh || !authKey) {
            return Response.json(
                { error: "Invalid subscription payload" },
                { status: 400 }
            );
        }

        // Upsert the subscription (if user logs in on a new device, add it, or update existing)
        // For simplicity, we'll store one primary endpoint per user here, but this could be expanded to one-to-many
        const query = `
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint) DO UPDATE 
      SET user_id = EXCLUDED.user_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          updated_at = NOW()
      RETURNING *
    `;

        const [subscription] = await sql(query, [userId, endpoint, p256dh, authKey]);

        if (!subscription) {
            return Response.json(
                { error: "Failed to save subscription" },
                { status: 500 }
            );
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error("POST /api/notifications/subscribe error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
