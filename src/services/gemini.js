// Gemini API service for Bell Pepper Monitor
// Model: gemini-1.5-flash (maps to gemini-flash-latest alias)

const GEMINI_MODEL = "gemini-1.5-flash-latest";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Build a structured agronomic prompt from live sensor readings.
 * This gives Gemini full context about the bell pepper environment.
 */
function buildPrompt(readings) {
  const { nitrogen, phosphorus, potassium, temperature, humidity } = readings;

  return `You are an expert agronomist AI specializing in bell pepper (Capsicum annuum) cultivation in greenhouse environments with LoRa IoT sensor networks.

You are analyzing LIVE sensor telemetry from a bell pepper greenhouse. Based on the data below, generate exactly 3 agronomic recommendations.

## Live Sensor Data
- Nitrogen (N): ${nitrogen.value} ppm  [Status: ${nitrogen.status}]  [Ideal: 40–60 ppm]
- Phosphorus (P): ${phosphorus.value} ppm  [Status: ${phosphorus.status}]  [Ideal: 30–50 ppm]
- Potassium (K): ${potassium.value} ppm  [Status: ${potassium.status}]  [Ideal: 20–35 ppm]
- Temperature: ${temperature}°C  [Ideal: 20–30°C]
- Humidity: ${humidity}%  [Ideal: 50–70%]

## Response Format (JSON ONLY — no markdown, no extra text)
Return EXACTLY this JSON array with 3 objects:
[
  {
    "tone": "warn" or "good",
    "tag": "short 2-3 word priority tag",
    "category": "agronomic category name",
    "title": "concise actionable title (max 8 words)",
    "body": "detailed agronomic advice mentioning specific values and actions (2-3 sentences)"
  }
]

Rules:
- Use "warn" tone for parameters that are out of range or need action
- Use "good" tone for parameters that are optimal
- Be specific with numbers and agronomic terminology
- Mention LoRa sensor telemetry naturally
- Focus on bell pepper crop physiology`;
}

/**
 * Call the Gemini API with sensor readings and return parsed suggestions.
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
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Gemini API error: ${msg}`);
  }

  const data = await response.json();

  // Extract text from Gemini response structure
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Parse JSON — strip any accidental markdown fences
  const clean = rawText.replace(/```json|```/g, "").trim();
  const suggestions = JSON.parse(clean);

  // Validate and assign unique IDs
  if (!Array.isArray(suggestions)) throw new Error("Unexpected AI response format.");

  return suggestions.map((s, i) => ({
    id: `ai-live-${Date.now()}-${i}`,
    tone:     s.tone     ?? "good",
    tag:      s.tag      ?? "Analysis",
    category: s.category ?? "General",
    title:    s.title    ?? "Observation",
    body:     s.body     ?? "",
  }));
}
