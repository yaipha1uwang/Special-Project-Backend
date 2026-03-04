import sql from '../utils/sql.js';
import { auth } from '../../auth.js';

// Google Gemini API integration (via REST since the official SDK might not be best for standard streaming in Hono)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // Fetch conversation history
    const history = await sql`
      SELECT id, role, message, created_at
      FROM chat_messages
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;

    return Response.json({ messages: history });
  } catch (error) {
    console.error("GET /api/chat error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Check Rate Limits (max 20 messages per hour per user)
    const recentMessages = await sql`
      SELECT COUNT(*) as count 
      FROM chat_messages 
      WHERE user_id = ${userId} 
        AND role = 'user' 
        AND created_at >= NOW() - INTERVAL '1 hour'
    `;

    if (parseInt(recentMessages[0].count) >= 20) {
      await sql`INSERT INTO audit_logs (user_id, action, details) VALUES (${userId}, 'RATE_LIMIT_EXCEEDED', ${JSON.stringify({ endpoint: '/api/chat' })})`;
      return Response.json({ error: "Rate limit exceeded. Try again in an hour." }, { status: 429 });
    }

    // 2. Save the user's message immediately
    await sql`
      INSERT INTO chat_messages (user_id, role, message)
      VALUES (${userId}, 'user', ${message})
    `;

    // 3. Fetch context (last 10 messages for chat history)
    const history = await sql`
      SELECT role, message 
      FROM chat_messages 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    // Reverse to chronological order
    history.reverse();

    // 4. Fetch User Context (Subjects)
    const subjects = await sql`SELECT name FROM subjects WHERE user_id = ${userId}`;
    const subjectList = subjects.map(s => s.name).join(", ") || "No specific subjects tracked yet.";

    const systemPrompt = `You are an advanced, highly technical AI study assistant. The user is currently studying the following subjects: ${subjectList}. Provide mature, in-depth, and rigorous academic explanations. Avoid basic or superficial answers, and instead dive into the technical intricacies, underlying principles, and advanced concepts relevant to the query. Use professional language, clear markdown formatting, code blocks, and structured lists to ensure the response is both comprehensive and highly readable.`;

    // 5. Structure conversation for Gemini
    const contents = [];
    for (const msg of history) {
      if (msg.message === message) continue; // Skip the exact message we just put in to avoid duplicates in edge cases
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.message }]
      });
    }
    // Append the latest message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // 6. Streaming generation using fetch directly (No SDK needed, highly compatible with standard web streams)
    if (!GEMINI_API_KEY) {
      return Response.json({ error: "GEMINI_API_KEY is missing from environment variables." }, { status: 500 });
    }

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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API Error:", errorText);
      await sql`INSERT INTO audit_logs (user_id, action, details) VALUES (${userId}, 'GEMINI_API_FAILURE', ${JSON.stringify({ status: aiResponse.status, response: errorText })})`;
      return Response.json({ error: "Upstream AI provider failed." }, { status: 502 });
    }

    let fullAccumulatedText = "";

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        try {
          const chunkText = new TextDecoder().decode(chunk);
          fullAccumulatedText += chunkText;
        } catch (e) {
          // Ignore decode errors mid-stream
        }
      },
      async flush() {
        try {
          let aiFullText = "";
          try {
            const textMatches = Array.from(fullAccumulatedText.matchAll(/"text":\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g));
            if (textMatches.length > 0) {
              aiFullText = textMatches.map(m => m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')).join('');
            }
          } catch (e) {
            console.error("Regex parsing error gemini:", e);
          }

          if (aiFullText) {
            await sql`
              INSERT INTO chat_messages (user_id, role, message)
              VALUES (${userId}, 'assistant', ${aiFullText})
            `;
          }
        } catch (dbError) {
          console.error("Failed to save stream to DB:", dbError);
        }
      }
    });

    return new Response(aiResponse.body.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "application/json", // Gemini streams as chunked JSON normally
        "Transfer-Encoding": "chunked"
      }
    });

  } catch (error) {
    console.error("POST /api/chat error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
