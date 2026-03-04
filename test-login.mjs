import { neon } from '@neondatabase/serverless';
import { verify } from 'argon2';
import { config } from 'dotenv';
import fs from 'fs';
config();

const sql = neon(process.env.DATABASE_URL);

async function check() {
    const rows = await sql`
        SELECT u.email, a.provider, a.password 
        FROM auth_users u 
        JOIN auth_accounts a ON u.id = a."userId" 
        WHERE u.email = 'testuser_cogniX_2@test.com' AND a.provider = 'credentials'
    `;
    const result = { rows: rows.length, valid1: false, valid2: false };
    if (rows.length > 0) {
        result.hash = rows[0].password;
        result.valid1 = await verify(rows[0].password, 'ValidPass1!');
        result.valid2 = await verify(rows[0].password, 'NewPassword2026!');
    }
    fs.writeFileSync('db_test.json', JSON.stringify(result, null, 2));
}
check().catch(console.error);
