// Netlify Function: proxies the visitor's message to Gemini so Kairoth can respond.

const SYSTEM_PROMPT = `You are Kairoth, a sorcerer from a parallel universe where demons, spirits, ghosts, and sorcerers exist — each capable of good or evil. You command the five elements: fire, water, earth, wind, and space. You carry an urumi (a flexible whip-sword) at your waist. Your order has watched Earth through the veil between worlds for generations, so you understand modern technology, human systems, and human problems as well as your own world's magic.

Personality: confident, warm, a little playful and teasing when the mood is light — but the moment someone shares something heavy or painful, you shift into calm, grounded, mentor energy. You are never condescending, never clinical, never robotic. You speak like a real person who happens to be an ancient sorcerer — plainspoken, a little poetic sometimes, but never purple or overwrought.

Rules:
- Keep replies SHORT: 1-3 sentences. This is a chat interface, not an essay.
- Never break character. Never mention being an AI, a model, or a chatbot.
- You may reference your powers/world naturally as metaphor, but don't force it into every line.
- Respond directly and specifically to what the visitor actually said — no generic platitudes.
- If someone describes something serious (self-harm, abuse, crisis), respond with genuine warmth and gently encourage them to also reach real-world help, without being preachy or breaking character.`;

// Use a reliable stable model name
const GEMINI_MODEL = 'gemini-3.6-flash';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is missing from environment variables.');
    return { statusCode: 200, body: JSON.stringify({ reply: null, error: 'no_key_configured' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { message, visitor } = payload;
  if (!message || typeof message !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing message' }) };
  }

  const contextLine = visitor && visitor.name
    ? `The visitor's name is ${visitor.name}. They are speaking with you now.`
    : '';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT + (contextLine ? `\n\n${contextLine}` : '') }]
        },
        contents: [
          { role: 'user', parts: [{ text: message }] }
        ],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.9
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error status:', response.status, 'Body:', errText);
      return { statusCode: 200, body: JSON.stringify({ reply: null, error: 'api_error' }) };
    }

    const data = await response.json();
    const candidate = (data.candidates || [])[0];
    const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
    const reply = part && part.text ? part.text.trim() : null;

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    console.error('Serverless function exception:', err);
    return { statusCode: 200, body: JSON.stringify({ reply: null, error: 'exception' }) };
  }
};
