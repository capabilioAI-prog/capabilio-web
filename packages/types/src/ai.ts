export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export type AIRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIRequestOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  userId?: string; // for usage tracking
  feature?: string; // e.g., 'mentor', 'hint', 'evaluation'
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface AIStreamChunk {
  delta: string;
  done: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  system: string;
  userTemplate: string; // with {{variable}} placeholders
  requiredVariables: string[];
}