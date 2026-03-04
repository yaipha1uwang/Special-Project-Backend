import sql from '../../utils/sql.js';
import { auth } from '../../../auth.js';
import { hash, verify } from 'argon2';

export async function PUT(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return Response.json({ error: "Both current and new passwords are required" }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return Response.json({ error: "New password must be at least 8 characters long" }, { status: 400 });
        }

        // 1. Fetch the user's credential account
        const accounts = await sql`
      SELECT password 
      FROM auth_accounts 
      WHERE "userId" = ${userId} AND provider = 'credentials'
    `;

        if (accounts.length === 0) {
            return Response.json({ error: "This account does not use a password for login. You likely signed up using a different provider like Google or GitHub." }, { status: 400 });
        }

        const storedHash = accounts[0].password;

        // 2. Verify the current password
        const isMatch = await verify(storedHash, currentPassword);
        if (!isMatch) {
            return Response.json({ error: "Incorrect current password." }, { status: 400 });
        }

        // 3. Hash the new password
        const newHash = await hash(newPassword);

        // 4. Update the DB
        await sql`
      UPDATE auth_accounts
      SET password = ${newHash}
      WHERE "userId" = ${userId} AND provider = 'credentials'
    `;

        return Response.json({ message: "Password updated successfully" }, { status: 200 });

    } catch (error) {
        console.error("PUT /api/profile/password error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
