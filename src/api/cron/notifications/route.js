import sql from '../../utils/sql.js';
import webpush from "web-push";

// Initialize web-push with VAPID keys
webpush.setVapidDetails(
    "mailto:support@studyplanner.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export async function GET(request) {
    try {
        // 1. Find users who have daily study reminders enabled
        // Note: In Postgres jsonb, we use ->> to extract text and cast to boolean, or check the raw string
        const profiles = await sql`
      SELECT user_id, notification_preferences
      FROM user_profiles
      WHERE (notification_preferences->>'daily_study_reminder')::boolean = true
    `;

        if (!profiles || profiles.length === 0) {
            return Response.json({ success: true, message: "No active users require reminders" });
        }

        const userIds = profiles.map(p => p.user_id);

        // 2. Fetch active browser subscriptions for those users
        const subscriptions = await sql`
      SELECT * FROM push_subscriptions
      WHERE user_id = ANY(${userIds})
    `;

        if (!subscriptions || subscriptions.length === 0) {
            return Response.json({ success: true, message: "Users want reminders, but no browsers are subscribed" });
        }

        let successCount = 0;
        let failCount = 0;

        // 3. Dispatch the push notifications using web-push
        const notificationPayload = JSON.stringify({
            title: "Daily Study Reminder",
            body: "Time to hit the books! Stick to your study plan to maintain your hot streak.",
            icon: "/favicon.ico",
            data: { url: "/dashboard" }
        });

        const sendPromises = subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, notificationPayload);
                successCount++;
            } catch (err) {
                console.error("Error sending push to endpoint:", sub.endpoint, err);
                // If the subscription is expired or invalid (410, 404), we should delete it from our DB
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
                }
                failCount++;
            }
        });

        await Promise.all(sendPromises);

        return Response.json({
            success: true,
            message: `Notifications sent. Success: ${successCount}. Failed/Removed: ${failCount}`
        });

    } catch (error) {
        console.error("Cron Push Notification Error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
