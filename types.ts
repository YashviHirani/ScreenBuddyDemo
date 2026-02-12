export enum AnalysisState {
  SMOOTH = 'Smooth',
  FRICTION = 'Friction Detected',
  ERROR = 'Error Detected',
  DISTRACTED = 'Distracted',
  COMPLETED = 'Goal Achieved',
  CLARIFY = 'Clarification Needed',
  UNKNOWN = 'Initializing...'
}

export enum ConfidenceLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  NONE = '---'
}

export interface AnalysisResult {
  timestamp: number;
  state: AnalysisState;
  observation: string;
  microAssist: string;
  confidence: ConfidenceLevel;
  screenshot?: string; // Base64
  automationSuggestion?: string; // New field for repetitive task detection
}

export interface ScreenCaptureState {
  isSharing: boolean;
  stream: MediaStream | null;
  error: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}