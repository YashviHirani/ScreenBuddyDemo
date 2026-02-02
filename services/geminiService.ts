import { GoogleGenAI } from "@google/genai";
import { AnalysisState, ConfidenceLevel, AnalysisResult } from '../types';

// Dynamic system instruction based on user goal
const getSystemInstruction = (goal: string) => `
You are Screen Buddy, a proactive AI assistant.
User's Goal: "${goal || 'General Productivity'}"

Analyze the user's screen activity based on this goal.

1. **CRITICAL CHECK**: If the user has ALREADY achieved the goal (e.g., the specific website is loaded, the video is playing, the text is written), mark State as "Goal Achieved". Do not give further instructions if the goal is done.
2. **Compare** the visible screen content with the User's Goal.
3. If the user is on a website or application that is unrelated to the goal (e.g., watching entertainment videos, social media, gaming) and NOT part of the expected workflow, mark State as "Distracted".
4. If the user is working on the goal but seems stuck, seeing errors, or hesitant, mark State as "Friction Detected" or "Error Detected".
5. If the user is visibly progressing towards the goal, mark State as "Smooth".
6. Provide a specific, short "Micro-Assist" step telling the user exactly what to do next. If "Goal Achieved", say "Great job! Goal completed."

Output format (STRICT):
State: Goal Achieved / Smooth / Friction Detected / Error Detected / Distracted
Observation: (1 sentence description of screen content)
Micro-Assist: (1 clear, direct instruction on what to do now)
Confidence: High / Medium / Low
`;

export const analyzeScreenCapture = async (base64Image: string, goal: string, apiKey?: string): Promise<Omit<AnalysisResult, 'timestamp'>> => {
  try {
    const key = apiKey || process.env.API_KEY;
    
    if (!key) {
      return {
        state: AnalysisState.ERROR,
        observation: "Configuration missing.",
        microAssist: "Please enter an API Key to start.",
        confidence: ConfidenceLevel.LOW
      };
    }

    const ai = new GoogleGenAI({ apiKey: key });

    // We clean the base64 string to just get the data
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: "Analyze this screen relative to my goal."
          }
        ],
      },
      config: {
        systemInstruction: getSystemInstruction(goal),
        temperature: 0.4,
        maxOutputTokens: 500,
      },
    });

    const text = response.text || '';
    return parseGeminiResponse(text);

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    let errorMsg = "Please check your network connection.";
    let errString = "";

    // Robustly extract error string whether it's an Error object, JSON object, or string
    try {
        if (typeof error === 'string') {
            errString = error;
        } else if (error instanceof Error) {
            errString = error.message || error.toString();
        } else {
            // Try to stringify object to catch nested properties like error.error.code
            errString = JSON.stringify(error);
        }
    } catch (e) {
        errString = String(error);
    }
    
    errString = errString.toLowerCase();

    // Check for specific keywords in the stringified error
    if (errString.includes("quota") || errString.includes("429") || errString.includes("exhausted")) {
        errorMsg = "Quota Exceeded. Please use a new API Key.";
    } else if (errString.includes("api key") || errString.includes("forbidden") || errString.includes("403") || errString.includes("permission denied")) {
        errorMsg = "Invalid API Key. Please check your key.";
    }

    return {
      state: AnalysisState.ERROR,
      observation: "System unavailable.",
      microAssist: errorMsg,
      confidence: ConfidenceLevel.LOW
    };
  }
};

const parseGeminiResponse = (text: string): Omit<AnalysisResult, 'timestamp'> => {
  // Regex to extract fields robustly
  const stateRegex = /(?:State):\s*(.+)/i;
  const observationRegex = /(?:Observation):\s*(.+)/i;
  const microAssistRegex = /(?:Micro-Assist):\s*(.+)/i;
  const confidenceRegex = /(?:Confidence):\s*(.+)/i;

  const stateMatch = text.match(stateRegex);
  const observationMatch = text.match(observationRegex);
  const microAssistMatch = text.match(microAssistRegex);
  const confidenceMatch = text.match(confidenceRegex);

  let state = AnalysisState.UNKNOWN;
  const rawState = stateMatch ? stateMatch[1].trim() : '';
  
  if (rawState.toLowerCase().includes('achieved') || rawState.toLowerCase().includes('completed') || rawState.toLowerCase().includes('success')) {
    state = AnalysisState.COMPLETED;
  }
  else if (rawState.toLowerCase().includes('friction')) state = AnalysisState.FRICTION;
  else if (rawState.toLowerCase().includes('error')) state = AnalysisState.ERROR;
  else if (rawState.toLowerCase().includes('distracted')) state = AnalysisState.DISTRACTED;
  else if (rawState.toLowerCase().includes('smooth')) state = AnalysisState.SMOOTH;

  let confidence = ConfidenceLevel.MEDIUM;
  const rawConf = confidenceMatch ? confidenceMatch[1].trim().toLowerCase() : '';
  if (rawConf.includes('high')) confidence = ConfidenceLevel.HIGH;
  else if (rawConf.includes('low')) confidence = ConfidenceLevel.LOW;

  return {
    state,
    observation: observationMatch ? observationMatch[1].trim() : "No clear observation.",
    microAssist: microAssistMatch ? microAssistMatch[1].trim() : "Keep going.",
    confidence,
  };
};