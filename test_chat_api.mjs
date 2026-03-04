import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function testFetch() {
    const sessions = await sql`SELECT "sessionToken" FROM auth_sessions LIMIT 1`;
    const token = sessions[0]?.sessionToken;

    if (!token) {
        console.error("No active login session found. Cannot test API.");
        process.exit(1);
    }

    try {
        const res = await fetch("http://localhost:4000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": `authjs.session-token=${token}`
            },
            body: JSON.stringify({ message: "Hello! What subjects am I currently studying?" })
        });

        console.log("Status:", res.status);

        if (res.ok) {
            console.log("Stream Connected! Receiving chunks...");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                process.stdout.write(decoder.decode(value));
            }
            console.log("\n\n-- Stream finished --");
        } else {
            console.log("Error:", await res.text());
        }

    } catch (e) {
        console.error("Fetch failed:", e);
    }
    process.exit(0);
}

testFetch();
