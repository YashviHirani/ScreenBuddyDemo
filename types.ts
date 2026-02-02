export enum AnalysisState {
  SMOOTH = 'Smooth',
  FRICTION = 'Friction Detected',
  ERROR = 'Error Detected',
  DISTRACTED = 'Distracted',
  COMPLETED = 'Goal Achieved',
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
}

export interface ScreenCaptureState {
  isSharing: boolean;
  stream: MediaStream | null;
  error: string | null;
}