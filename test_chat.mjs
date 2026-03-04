import { config } from 'dotenv';
config();

async function testChat() {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    console.log("Key exists:", !!GEMINI_API_KEY);

    const systemPrompt = "You are a test assistant.";
    const contents = [{ role: 'user', parts: [{ text: 'Hello, what subjects am I studying?' }] }];

    try {
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: contents,
            })
        });

        console.log("Status:", aiResponse.status);
        console.log("Response:", await aiResponse.text());
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testChat();
