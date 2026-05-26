import { Devvit, RedisClient } from '@devvit/public-api';
import { RedditPost, RedditUser, DetectionResult } from '../types/index.js';
import { RedisSchema } from '../redis/schema.js';

export async function generateAIExplanation(
  context: { settings: Devvit.Context['settings'] },
  post: RedditPost,
  user: RedditUser,
  detection: DetectionResult,
  redis?: RedisClient
): Promise<string> {
  // 1. Get settings — check Devvit install settings first, then Redis fallback
  let apiKey = await context.settings.get('api_key') as string | undefined;
  let provider = await context.settings.get('ai_provider') as string | undefined;

  if ((!apiKey || apiKey.trim() === '') && redis) {
    apiKey = await RedisSchema.getApiKey(redis);
    provider = provider || await RedisSchema.getAiProvider(redis) || 'gemini';
  }

  const prompt = `
You are Sentinel AI, a Reddit network intelligence assistant. A moderator has requested network analysis on a post by user u/${user.username}.
Here is the context:
- Post Title: "${post.title}"
- Subreddit: r/${post.subreddit}
- URL: ${post.url || 'None'}
- Author Karma: ${user.karma}
- Author Account Age: ${user.accountAgeDays.toFixed(1)} days
- Combined Risk Score: ${detection.riskScore}/100

Triggered Risk Signals:
${detection.reasons.map(r => `- ${r}`).join('\n')}

Task: Write a 4-5 line intelligence brief explaining why this account looks coordinated. Be concise and clear. Highlight the key risk signals and network indicators (shared domains, co-posting accounts, subreddit spread). State the suspected campaign type and confidence level. Do not use markdown formatting. Use plain text only.
`;

  // 2. Local Fallback if API key is missing
  if (!apiKey || apiKey.trim() === '') {
    return generateLocalExplanation(user.username, detection);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-5o-mini',
          messages: [
            { role: 'system', content: 'You are Sentinel AI, a precise moderation assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 150
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI HTTP error ${response.status}`);
      }

      const data = await response.json() as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content?.trim() || generateLocalExplanation(user.username, detection);
    } else {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          }),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini HTTP error ${response.status}`);
      }

      const data = await response.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      };

      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || generateLocalExplanation(user.username, detection);
    }
  } catch (error) {
    console.error('Error generating AI explanation:', error);
    return `**AI Generation Error:** ${(error as Error).message}\n\n${generateLocalExplanation(user.username, detection)}`;
  }
}

function generateLocalExplanation(username: string, detection: DetectionResult): string {
  const signalSummary = detection.reasons.length > 0
    ? detection.reasons.map(r => `• ${r}`).join('\n')
    : '• No critical heuristics triggered.';

  return `User Heuristics Breakdown: u/${username}
Sentinel Network Intelligence Analysis shows a calculated Risk Score of ${detection.riskScore}/100.

Triggered Info:
${signalSummary}

*AI-powered semantic summary is unavailable because an API Key (Gemini/OpenAI) is not configured in Settings.*
`;
}
