export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface AIRequestOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  feature?: string;
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

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  system: string;
  userTemplate: string;
  requiredVariables: string[];
}
