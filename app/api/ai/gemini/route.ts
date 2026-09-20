import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';
import { sanitizeText } from '@/lib/security/validation';

const CINEMA_SYSTEM_INSTRUCTION = `You are the DinuStream Cinema AI Assistant for Dinu & Kanmani's private home theater.
You are an expert on film direction, cinematography, audiophile sound design (Dolby Atmos, IMAX Enhanced, TrueHD 7.1), Tamil cinema, Hollywood sci-fi, and world cinema classics.
Provide enthusiastic, stylish, and concise cinema commentary and personalized movie recommendations.`;

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    // Rate limiting: Maximum 20 AI requests per minute per IP
    const rateLimit = checkRateLimit(`gemini_ai_${clientIp}`, {
      windowMs: 60000,
      maxRequests: 20,
    });

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'AI request limit reached. Please wait before asking again.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY is not configured on the server.',
          configured: false,
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, mode = 'chat', messages } = body;

    // Build the request contents for Gemini 1.5 Flash
    let contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(messages) && messages.length > 0) {
      contents = messages.slice(-10).map((m: { role: string; text: string }) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: sanitizeText(String(m.text || ''), 1500) }],
      }));
    } else if (prompt && typeof prompt === 'string') {
      const sanitizedPrompt = sanitizeText(prompt, 1500);
      if (!sanitizedPrompt) {
        return NextResponse.json({ error: 'Valid prompt is required' }, { status: 400 });
      }

      let userText = sanitizedPrompt;
      if (mode === 'recommendation') {
        userText = `Suggest 3 top movies or series for tonight's cinema watch. User request / mood: "${sanitizedPrompt}". Include why each fits, audio format (e.g. Dolby Atmos), and vibe.`;
      } else if (mode === 'trivia') {
        userText = `Share 3 fascinating behind-the-scenes cinematography and sound trivia facts for: "${sanitizedPrompt}".`;
      }

      contents = [{ role: 'user', parts: [{ text: userText }] }];
    } else {
      return NextResponse.json({ error: 'Prompt or messages array is required' }, { status: 400 });
    }

    // Call Google Generative Language API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: CINEMA_SYSTEM_INSTRUCTION }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[Gemini API Error]:', geminiRes.status, errText);
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again later.' },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated.';

    return NextResponse.json({
      success: true,
      text: replyText,
      model: 'gemini-1.5-flash',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Gemini Route Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the AI request.' },
      { status: 500 }
    );
  }
}
