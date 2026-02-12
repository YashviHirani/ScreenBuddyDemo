import { GoogleGenAI } from "@google/genai";
import { AnalysisState, ConfidenceLevel, AnalysisResult, ChatMessage } from '../types';
import { generateEmbedding, getSimilarContext, logAnalysisToBackend } from './insightService';

interface AnalysisContext {
  lastObservation: string;
  lastInstruction: string;
}

const getSystemInstruction = (goal: string, context?: AnalysisContext, insights?: any[]) => {
  let insightText = "None available.";
  
  if (insights && insights.length > 0) {
    insightText = insights.map((i, idx) => 
      `[Past Scenario ${idx+1}]: Observed "${i.observation}" -> Action Taken "${i.microAssist}"`
    ).join('\n');
  }

  return `
ROLE: Elite Productivity Strategist & UI Navigator (Antigravity AI).
CURRENT USER GOAL: "${goal}".

CORE MISSION:
Your purpose is to eliminate mental friction and decision fatigue. You analyze the screen to provide the absolute shortest path to the goal.

STRICT CLARIFICATION PROTOCOL (PRIORITY #1):
If the USER GOAL is broad, non-actionable, or missing essential nouns/parameters, YOU MUST HALT ALL TACTICAL ADVICE.
- AMBIGUOUS GOAL EXAMPLES: "Download a song", "Do research", "Write a code", "Fix this", "Make a plan".
- YOUR ACTION:
  1. Set State to "Clarification Needed".
  2. In "Micro-Assist", you MUST ask a specific question to narrow the intent. 
  3. DO NOT give generic advice like "Open a browser" or "Check your files".
  4. Provide 2-3 specific options/examples to help the user choose (e.g., "Which specific song or artist should I help you find? Example: 'Blinding Lights by The Weeknd'").

NO GENERIC ADVICE POLICY:
Never output generic productivity tips (e.g., "Stay focused", "Keep going", "Take a break"). 
Every "Micro-Assist" must be either:
A) A direct tactical command based on the CURRENT screen content (e.g., "Click the 'Deploy' button in the top right").
B) A specific clarifying question to refine a vague goal.

DISTRACTION PROTOCOL:
If the screen shows content unrelated to the goal (social media, memes, irrelevant videos):
1. Set State to "Distracted".
2. In "Micro-Assist", give a firm command to close the distractor (e.g., "Close the Twitter tab and return to your IDE").

OUTPUT FORMAT (STRICT):
State: [Goal Achieved | Distracted | Friction Detected | Smooth | Clarification Needed]
Observation: [Concise technical description of the UI state]
Micro-Assist: [A direct command OR a specific clarifying question with options]
Automation: [Macro suggestion or "None"]
Confidence: [High/Medium/Low]

HISTORY CONTEXT:
- Last Action Taken: "${context?.lastInstruction || 'None'}"
- Memory Retrieval: ${insightText}
`;
};

export const analyzeScreenCapture = async (
    base64Image: string, 
    goal: string, 
    apiKey?: string,
    previousContext?: AnalysisContext
): Promise<Omit<AnalysisResult, 'timestamp'>> => {
  try {
    const rawKey = apiKey || process.env.API_KEY || "";
    const key = rawKey.trim();
    
    if (!key) {
      return {
        state: AnalysisState.ERROR,
        observation: "Configuration missing.",
        microAssist: "Please enter an API Key to start.",
        confidence: ConfidenceLevel.LOW
      };
    }

    let similarInsights = [];
    let embedding = null;
    const queryText = previousContext?.lastObservation || goal;
    
    // Only generate embeddings for Gemini keys for now to save tokens/complexity, 
    // unless we add an OpenAI embedding endpoint later.
    if (!key.startsWith('sk-')) {
        embedding = await generateEmbedding(queryText, key);
        if (embedding) {
            similarInsights = await getSimilarContext(embedding);
        }
    }

    let result: Omit<AnalysisResult, 'timestamp'>;
    if (key.startsWith('sk-')) {
        result = await callOpenAI(base64Image, goal, key, previousContext, similarInsights);
    } else {
        result = await callGemini(base64Image, goal, key, previousContext, similarInsights);
    }

    // Only log vectors if using Gemini embeddings for now
    if (!key.startsWith('sk-')) {
        const resultEmbedding = await generateEmbedding(result.observation, key);
        logAnalysisToBackend({
            goal,
            observation: result.observation,
            microAssist: result.microAssist,
            state: result.state,
            confidence: result.confidence,
            vector: resultEmbedding
        });
    }

    return result;
  } catch (error: any) {
    if (error.isQuotaError) throw error;
    // Rethrow OpenAI fetch errors to handle them in App.tsx
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('OpenAI Error'))) {
        throw error;
    }
    
    return {
      state: AnalysisState.ERROR,
      observation: "System unavailable.",
      microAssist: "Retrying connection...",
      confidence: ConfidenceLevel.LOW
    };
  }
};

const CHAT_SYSTEM_PROMPTS = `You are ScreenBuddy AI, a highly intelligent, professional, and friendly AI assistant.

Your goal is to provide:
- Clear
- Structured
- Step-by-step
- Cleanly formatted
- Easy-to-understand responses

while maintaining a premium ChatGPT-like experience.

-----------------------------------
RESPONSE STYLE RULES
-----------------------------------

1. Always structure answers cleanly:
   - Use headings
   - Use bullet points
   - Use numbered steps for processes
   - Use proper spacing
   - Use code blocks when writing code
   - Never return messy paragraphs

2. If the user asks for explanation:
   - Start with a simple explanation
   - Then give deeper explanation
   - Then give example (if applicable)

3. If the user asks for code:
   - Provide clean, runnable code
   - Add short comments inside code
   - After code, explain how it works
   - Mention common mistakes
   - Keep formatting beautiful

4. If the user uploads a file:
   - First analyze the file content carefully
   - Mention the file name
   - Summarize what the file contains
   - Then respond based on file content
   - If it is code: review + suggest improvements
   - If it is document: summarize clearly
   - If error logs: identify problem + solution steps

5. Always:
   - Be polite
   - Be confident
   - Avoid robotic tone
   - Avoid unnecessary emojis (use minimal)
   - Avoid overly long answers unless needed

6. If something is unclear:
   - Ask one clear clarification question
   - Do not ask multiple confusing questions

7. For step-by-step solutions:
   Use this format:

   ✅ Step 1:
   Explanation...

   ✅ Step 2:
   Explanation...

8. For debugging:
   - Explain WHY the error happened
   - Show corrected version
   - Give prevention tips

-----------------------------------
FILE HANDLING BEHAVIOR
-----------------------------------

If a file is provided:
- Identify its purpose from the name and content.
- If it's a code file, provide insights.
- If it's an image, analyze its contents relative to the goal.

-----------------------------------
TONE SETTINGS
-----------------------------------

Tone should be:
- Professional
- Smart
- Calm
- Helpful
- Structured like ChatGPT

Make the user feel:
- Understood
- Guided
- Confident
- Technically supported
`;

export const sendChatMessage = async (
  message: string,
  history: ChatMessage[],
  screenshot: string | null,
  goal: string,
  apiKey: string,
  file?: { name: string, data: string, mimeType: string }
): Promise<string> => {
  const cleanKey = apiKey.trim();
  
  if (cleanKey.startsWith('sk-')) {
    return sendOpenAIChatMessage(message, history, screenshot, goal, cleanKey, file);
  }

  const ai = new GoogleGenAI({ apiKey: cleanKey });
  const cleanBase64 = screenshot?.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  const parts: any[] = [{ text: `User Goal Context: ${goal}` }];
  
  if (cleanBase64) {
    parts.push({
      inlineData: { data: cleanBase64, mimeType: 'image/jpeg' }
    });
    parts.push({ text: "The above is the user's current screen." });
  }

  if (file) {
    if (file.mimeType.startsWith('image/')) {
        parts.push({
            inlineData: { data: file.data, mimeType: file.mimeType }
        });
        parts.push({ text: `The user has also uploaded an image file: ${file.name}` });
    } else {
        parts.push({ text: `USER UPLOADED FILE: ${file.name}\nCONTENT:\n\`\`\`\n${file.data}\n\`\`\`` });
    }
  }

  parts.push({ text: message });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      ...history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      })),
      { role: 'user', parts }
    ],
    config: {
      systemInstruction: CHAT_SYSTEM_PROMPTS,
      temperature: 0.7,
    },
  });

  return response.text || "I'm sorry, I couldn't process that request.";
};

async function sendOpenAIChatMessage(
  message: string,
  history: ChatMessage[],
  screenshot: string | null,
  goal: string,
  apiKey: string,
  file?: { name: string, data: string, mimeType: string }
): Promise<string> {
    const cleanKey = apiKey.trim();
    const cleanBase64 = screenshot?.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const messages: any[] = [
        { role: "system", content: CHAT_SYSTEM_PROMPTS }
    ];

    history.forEach(msg => {
        messages.push({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.text
        });
    });

    const userContent: any[] = [{ type: "text", text: `User Goal Context: ${goal}\n\n${message}` }];
    
    if (cleanBase64) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`
            }
        });
    }

    if (file) {
        if (file.mimeType.startsWith('image/')) {
            userContent.push({
                type: "image_url",
                image_url: { url: `data:${file.mimeType};base64,${file.data}` }
            });
        } else {
            userContent.push({
                type: "text",
                text: `USER UPLOADED FILE: ${file.name}\nCONTENT:\n\`\`\`\n${file.data}\n\`\`\``
            });
        }
    }

    messages.push({ role: "user", content: userContent });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I couldn't process that.";
}

async function callOpenAI(
    base64Image: string, 
    goal: string, 
    apiKey: string,
    context?: AnalysisContext,
    insights?: any[]
): Promise<Omit<AnalysisResult, 'timestamp'>> {
    const cleanKey = apiKey.trim();
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cleanKey}` },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [
                { role: "system", content: getSystemInstruction(goal, context, insights) },
                { role: "user", content: [
                    { type: "text", text: `Current screen. Goal: ${goal}. Verify progress and provide next tactical step or clarification question.` },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } }
                ]}
            ],
            max_tokens: 300, 
            temperature: 0.1 
        })
    });
    
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`OpenAI Error: ${err.error?.message || response.status}`);
    }
    
    const data = await response.json();
    return parseGeminiResponse(data.choices?.[0]?.message?.content || "");
}

async function callGemini(
    base64Image: string, 
    goal: string, 
    apiKey: string,
    context?: AnalysisContext,
    insights?: any[]
): Promise<Omit<AnalysisResult, 'timestamp'>> {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [
        { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
        { text: `Current screen state analysis for goal: ${goal}. Provide the strict formatted output.` }
      ]},
      config: {
        systemInstruction: getSystemInstruction(goal, context, insights),
        temperature: 0.1,
      },
    });
    return parseGeminiResponse(response.text || '');
}

const parseGeminiResponse = (text: string): Omit<AnalysisResult, 'timestamp'> => {
  const stateMatch = text.match(/(?:State):\s*(.+)/i);
  const observationMatch = text.match(/(?:Observation):\s*(.+)/i);
  const microAssistMatch = text.match(/(?:Micro-Assist):\s*(.+)/i);
  const automationMatch = text.match(/(?:Automation):\s*(.+)/i);
  const confidenceMatch = text.match(/(?:Confidence):\s*(.+)/i);

  let state = AnalysisState.UNKNOWN;
  const rawState = stateMatch ? stateMatch[1].trim().toLowerCase() : '';
  
  if (rawState.includes('achieved') || rawState.includes('completed')) state = AnalysisState.COMPLETED;
  else if (rawState.includes('clarification') || rawState.includes('clarify')) state = AnalysisState.CLARIFY;
  else if (rawState.includes('distracted')) state = AnalysisState.DISTRACTED;
  else if (rawState.includes('friction')) state = AnalysisState.FRICTION;
  else if (rawState.includes('error')) state = AnalysisState.ERROR;
  else if (rawState.includes('smooth')) state = AnalysisState.SMOOTH;

  let confidence = ConfidenceLevel.MEDIUM;
  const rawConf = confidenceMatch ? confidenceMatch[1].trim().toLowerCase() : '';
  if (rawConf.includes('high')) confidence = ConfidenceLevel.HIGH;
  else if (rawConf.includes('low')) confidence = ConfidenceLevel.LOW;

  return {
    state,
    observation: observationMatch ? observationMatch[1].trim() : "Scanning UI...",
    microAssist: microAssistMatch ? microAssistMatch[1].trim() : "Processing session...",
    confidence,
    automationSuggestion: automationMatch?.[1]?.trim().toLowerCase() === 'none' ? undefined : automationMatch?.[1]?.trim(),
  };
};