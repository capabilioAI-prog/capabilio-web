import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import type { AIProvider, AIRequestOptions, AIResponse } from './types';
import { getDefaultProvider, getDefaultModel } from './provider-manager';
import { getPrompt, renderPrompt } from './prompt-registry';

function getModel(provider: AIProvider, modelName: string) {
  switch (provider) {
    case 'openai': return openai(modelName);
    case 'anthropic': return anthropic(modelName);
    case 'gemini': return google(modelName);
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}

export class AIService {
  async generate(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: AIRequestOptions = {}
  ): Promise<AIResponse> {
    const provider = options.provider ?? getDefaultProvider();
    const modelName = options.model ?? getDefaultModel(provider);
    const model = getModel(provider, modelName);

    const startTime = Date.now();

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const { text, usage } = await generateText({
      model: model as any,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 2000,
    });

    const latencyMs = Date.now() - startTime;

    return {
      content: text,
      provider,
      model: modelName,
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
      latencyMs,
    };
  }

  async *stream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: AIRequestOptions = {}
  ): AsyncGenerator<string> {
    const provider = options.provider ?? getDefaultProvider();
    const modelName = options.model ?? getDefaultModel(provider);
    const model = getModel(provider, modelName);

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const result = await streamText({
      model: model as any,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 2000,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  async generateFromPrompt(
    promptId: string,
    variables: Record<string, string>,
    options: AIRequestOptions = {}
  ): Promise<AIResponse> {
    const template = getPrompt(promptId);
    const userContent = renderPrompt(template, variables);

    return this.generate([
      { role: 'system', content: template.system },
      { role: 'user', content: userContent },
    ], options);
  }

  async *streamFromPrompt(
    promptId: string,
    variables: Record<string, string>,
    options: AIRequestOptions = {}
  ): AsyncGenerator<string> {
    const template = getPrompt(promptId);
    const userContent = renderPrompt(template, variables);

    yield* this.stream([
      { role: 'system', content: template.system },
      { role: 'user', content: userContent },
    ], options);
  }
}

export const aiService = new AIService();
