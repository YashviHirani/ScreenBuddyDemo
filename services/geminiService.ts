import { GoogleGenAI } from "@google/genai";
import { AnalysisState, ConfidenceLevel, AnalysisResult } from '../types';

// Optimized system instruction to save tokens
const getSystemInstruction = (goal: string) => `
Role: Productivity AI. User Goal: "${goal || 'Work'}".
Analyze screen vs Goal.
1. DONE? -> State: Goal Achieved.
2. UNRELATED app/site? -> State: Distracted.
3. STUCK/ERROR? -> State: Friction Detected.
4. WORKING? -> State: Smooth.
Output:
State: [Category]
Observation: [1 sentence]
Micro-Assist: [1 short command]
Confidence: High/Medium/Low
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
            text: "Analyze screen."
          }
        ],
      },
      config: {
        systemInstruction: getSystemInstruction(goal),
        temperature: 0.4,
        maxOutputTokens: 150,
      },
    });

    // Safety check: sometimes error messages come as valid text responses
    const text = response.text || '';
    if (text.toLowerCase().includes("quota") || text.toLowerCase().includes("exhausted")) {
       throw { isQuotaError: true, message: text }; // Throw to trigger rotation
    }

    return parseGeminiResponse(text);

  } catch (error: any) {
    // ---------------------------------------------------------
    // AGGRESSIVE ERROR PARSING FOR QUOTA DETECTION
    // ---------------------------------------------------------
    
    // 1. Convert any error format (Object, Error, String) into a searchable string
    let fullErrorString = "";
    
    try {
       // If it's a standard Error object, get message and stack
       if (error instanceof Error) {
           fullErrorString = `${error.message} ${error.stack || ''}`;
       } 
       // If it's a JSON object (like the SDK often returns), stringify it
       else if (typeof error === 'object') {
           fullErrorString = JSON.stringify(error);
       } 
       // Fallback
       else {
           fullErrorString = String(error);
       }
    } catch (e) {
       fullErrorString = "Unknown error parsing failed";
    }

    fullErrorString = fullErrorString.toLowerCase();

    // 2. Define keywords that indicate we should switch keys
    const isQuota = 
        fullErrorString.includes("quota") || 
        fullErrorString.includes("429") || 
        fullErrorString.includes("resource_exhausted") || 
        fullErrorString.includes("exhausted") ||
        fullErrorString.includes("limit") || // rate limit
        fullErrorString.includes("failed to call the gemini api"); // Specific user error

    if (isQuota) {
        // We throw a specific object that performAnalysis can catch to trigger immediate rotation
        throw { isQuotaError: true, originalError: error };
    }

    // For non-quota errors (Network, parsing, etc), we return a graceful error state
    // Log it so user can debug if needed
    console.error("Non-quota Gemini Error:", fullErrorString);

    return {
      state: AnalysisState.ERROR,
      observation: "System unavailable.",
      microAssist: "Connection error. Retrying...",
      confidence: ConfidenceLevel.LOW
    };
  }
};

const parseGeminiResponse = (text: string): Omit<AnalysisResult, 'timestamp'> => {
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
    observation: observationMatch ? observationMatch[1].trim() : "Analyzing...",
    microAssist: microAssistMatch ? microAssistMatch[1].trim() : "Hold on...",
    confidence,
  };
};