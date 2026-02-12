
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from '../types';

export const generateEmbedding = async (text: string, apiKey: string): Promise<number[] | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: "text-embedding-004", 
      contents: { parts: [{ text }] }
    });
    return response.embeddings?.[0]?.values || null;
  } catch (e) {
    console.warn("Embedding generation failed:", e);
    return null;
  }
};

export const getSimilarContext = async (vector: number[]) => {
  try {
    const response = await axios.post('/api/context', { vector });
    return response.data.context || [];
  } catch (e) {
    console.warn("Backend context fetch failed:", e);
    return [];
  }
};

export const fetchHistory = async () => {
  try {
    const response = await axios.get('/api/history');
    return response.data || [];
  } catch (e) {
    console.warn("Backend history fetch failed:", e);
    return [];
  }
};

export const fetchChatHistory = async (): Promise<ChatMessage[]> => {
  try {
    const response = await axios.get('/api/chat/history');
    return response.data.map((m: any) => ({
      role: m.role,
      text: m.text,
      timestamp: new Date(m.timestamp).getTime()
    })) || [];
  } catch (e) {
    console.warn("Backend chat history fetch failed:", e);
    return [];
  }
};

export const logChatMessage = async (role: 'user' | 'model', text: string, goalContext?: string) => {
  try {
    await axios.post('/api/chat/log', { role, text, goalContext });
  } catch (e) {
    console.warn("Backend chat logging failed:", e);
  }
};

export const logAnalysisToBackend = async (data: any) => {
  try {
    await axios.post('/api/log', data);
  } catch (e) {
    console.warn("Backend logging failed:", e);
  }
};
