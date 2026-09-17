# AI Features Documentation

## Location
The AI logic for the Bell Pepper Monitor application is primarily located in the following file:
- **`src/services/gemini.js`**

## AI Implementation Details
The application utilizes the **Google Gemini API** (specifically the `gemini-1.5-flash-latest` model) to provide agronomic suggestions based on live sensor telemetry data.

### How it Works
1. **Prompt Generation:** The function `buildPrompt(readings)` takes live sensor readings (Nitrogen, Phosphorus, Potassium, Temperature, and Humidity) and constructs a structured prompt.
2. **Context:** The prompt instructs the AI to act as an "expert agronomist AI specializing in bell pepper (Capsicum annuum) cultivation in greenhouse environments with LoRa IoT sensor networks."
3. **Response Format:** The AI is strictly instructed to return a JSON array containing exactly 3 agronomic recommendations. Each recommendation includes:
   - `tone`: "warn" (for out of range parameters) or "good" (for optimal parameters)
   - `tag`: A short 2-3 word priority tag
   - `category`: The agronomic category name
   - `title`: A concise, actionable title
   - `body`: Detailed agronomic advice (2-3 sentences)

### API Key Configuration
To make the AI features work, a valid Gemini API key is required. 
- The API key should be provided when calling the `getAISuggestions` function.
- In the project's environment variables, this is typically stored as `AI_API_KEY` (as updated in your `.env` file). You will need to replace `your_gemini_api_key_here` with a real key from Google AI Studio.
