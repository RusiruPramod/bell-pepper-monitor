// Gemini API service for Bell Pepper Monitor
// Model: gemini-3.8-flash

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Build a structured agronomic prompt from live sensor readings.
 */
function buildPrompt(readings) {
  const { nitrogen, phosphorus, potassium, temperature, humidity } = readings;

  return `You are an expert agronomist AI for bell pepper greenhouse monitoring.

Analyze this LIVE LoRa sensor data and return EXACTLY 3 agronomic recommendations.

Sensor Readings:
- Nitrogen (N): ${nitrogen.value} ppm [Status: ${nitrogen.status}] [Ideal: 40-60 ppm]
- Phosphorus (P): ${phosphorus.value} ppm [Status: ${phosphorus.status}] [Ideal: 30-50 ppm]
- Potassium (K): ${potassium.value} ppm [Status: ${potassium.status}] [Ideal: 20-35 ppm]
- Temperature: ${temperature}C [Ideal: 20-30C]
- Humidity: ${humidity}% [Ideal: 50-70%]

Return ONLY a raw JSON array with no markdown, no code fences, no explanation. Start your response with [ and end with ].

Format:
[{"tone":"warn","tag":"High Priority","category":"Soil Nutrition","title":"Potassium Too Low","body":"K is at 18 ppm below the 20-35 ppm range. Apply potassium sulfate via drip irrigation at the next watering cycle to prevent blossom end rot."},{"tone":"good","tag":"Optimal","category":"Microclimate","title":"Temperature in Ideal Range","body":"Temperature at 27C is within the 20-30C optimal zone. Maintain current greenhouse ventilation settings."},{"tone":"good","tag":"Balanced","category":"N-P Ratio","title":"Nitrogen and Phosphorus Stable","body":"N at 45 ppm and P at 35 ppm are both optimal. No corrective action is needed at this time."}]

Rules: tone must be warn or good, tag is 2-3 words, title max 8 words, body is 1-2 SHORT sentences max 25 words. Output ONLY the JSON array.`;
}

/**
 * Extract a JSON array from raw text, tolerating code fences and extra prose.
 */
function extractJsonArray(text) {
  // 1. Direct parse
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }

  // 2. Strip markdown fences then parse
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    const parsed = JSON.parse(stripped);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }

  // 3. Extract the first [ ... ] block
  const match = stripped.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  return null;
}

/**
 * Call the Gemini API with sensor readings and return parsed suggestions.
 * Retries up to 3 times on transient server errors (503 / high demand).
 * @param {string} apiKey - Gemini API key from user settings
 * @param {object} readings - live sensor readings from LIVE_READINGS
 * @returns {Promise<Array>} - array of suggestion objects
 */
export async function getAISuggestions(apiKey, readings) {
  if (!apiKey) throw new Error("No API key configured. Please add your Gemini API key in Settings.");

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: buildPrompt(readings) }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,  // increased — 1024 caused truncated JSON
    },
  };

  const MAX_RETRIES = 2;  // fewer retries — too many caused 429 rate limit
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg = data?.error?.message ?? `HTTP ${response.status}`;
        const isRateLimit = response.status === 429 || msg.toLowerCase().includes("quota");
        const isRetryable = response.status === 503 ||
          msg.toLowerCase().includes("high demand") ||
          msg.toLowerCase().includes("overloaded");

        // Parse "Please retry in Xs" from quota errors so the UI can show a countdown
        if (isRateLimit) {
          const match = msg.match(/retry in ([\d.]+)s/i);
          const retryAfter = match ? Math.ceil(parseFloat(match[1])) : 60;
          const shortMsg = `Rate limit reached. Please retry in ${retryAfter}s.`;
          const err = new Error(shortMsg);
          err.retryAfter = retryAfter;
          throw err;
        }

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = attempt * 5000;
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        throw new Error(`Gemini API error: ${msg}`);
      }

      // Extract raw text from Gemini response
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!rawText.trim()) {
        const reason = data?.candidates?.[0]?.finishReason ?? "UNKNOWN";
        throw new Error(`Gemini returned an empty response (reason: ${reason}). Please try again.`);
      }

      // Log for debugging
      console.debug("[Gemini] Raw response:", rawText.slice(0, 500));

      // Robust JSON extraction — tolerates fences, extra prose, bracket search
      const suggestions = extractJsonArray(rawText);

      if (!suggestions) {
        console.error("[Gemini] Could not extract JSON from:", rawText.slice(0, 500));
        throw new Error("Could not parse AI response. Please try again.");
      }

      // Validate and assign unique IDs
      if (!Array.isArray(suggestions)) throw new Error("Unexpected AI response format.");

      return suggestions.map((s, i) => ({
        id: `ai-live-${Date.now()}-${i}`,
        tone: s.tone ?? "good",
        tag: s.tag ?? "Analysis",
        category: s.category ?? "General",
        title: s.title ?? "Observation",
        body: s.body ?? "",
      }));

    } catch (err) {
      lastError = err;
      // Only retry on transient errors
      const isTransient = err.message?.toLowerCase().includes("high demand") ||
        err.message?.toLowerCase().includes("503") ||
        err.message?.toLowerCase().includes("429");
      if (!isTransient || attempt >= MAX_RETRIES) break;
      await new Promise(res => setTimeout(res, attempt * 5000)); // 5s then 10s
    }
  }

  throw lastError;
}
