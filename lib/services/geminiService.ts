export interface GeminiAIResponse {
  success?: boolean;
  text?: string;
  error?: string;
  configured?: boolean;
}

class GeminiCinemaService {
  /**
   * Request movie night recommendation from Gemini AI
   */
  async getRecommendation(moodOrQuery: string): Promise<string> {
    try {
      const res = await fetch('/api/ai/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: moodOrQuery, mode: 'recommendation' }),
      });
      const data: GeminiAIResponse = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to get recommendation');
      }
      return data.text || 'No recommendation received.';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to AI';
      return `AI recommendation unavailable: ${message}`;
    }
  }

  /**
   * Get behind-the-scenes movie trivia & audio details
   */
  async getTrivia(title: string): Promise<string> {
    try {
      const res = await fetch('/api/ai/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: title, mode: 'trivia' }),
      });
      const data: GeminiAIResponse = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to get trivia');
      }
      return data.text || 'No trivia available.';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to AI';
      return `Cinema trivia unavailable: ${message}`;
    }
  }

  /**
   * Free-form cinema chat question with Gemini AI
   */
  async askCinemaAI(prompt: string): Promise<string> {
    try {
      const res = await fetch('/api/ai/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode: 'chat' }),
      });
      const data: GeminiAIResponse = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to get response');
      }
      return data.text || 'No response received.';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to AI';
      return `Cinema AI unavailable: ${message}`;
    }
  }
}

export const geminiService = new GeminiCinemaService();
