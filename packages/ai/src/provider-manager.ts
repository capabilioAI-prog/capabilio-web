import type { AIProvider } from './types';

export function getDefaultProvider(): AIProvider {
  const provider = process.env.AI_DEFAULT_PROVIDER as AIProvider;
  if (provider && ['openai', 'anthropic', 'gemini'].includes(provider)) {
    return provider;
  }
  // Auto-detect based on available API keys
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return 'gemini';
  throw new Error('No AI provider configured. Set AI_DEFAULT_PROVIDER and corresponding API key.');
}

export function getDefaultModel(provider: AIProvider): string {
  const envModel = process.env.AI_DEFAULT_MODEL;
  if (envModel) return envModel;
  
  const defaults: Record<AIProvider, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    gemini: 'gemini-1.5-pro',
  };
  return defaults[provider] ?? 'gpt-4o';
}

export function validateProviderConfig(provider: AIProvider): void {
  const keyMap: Record<AIProvider, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
  };
  const key = keyMap[provider] ?? 'OPENAI_API_KEY';
  if (!process.env[key]) {
    throw new Error(`${key} environment variable is required for provider '${provider}'`);
  }
}
