export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateRequestDto {
  prompt: string;
  history: AiMessage[];
}

export interface Prompt {
  system: string;
  history: AiMessage[];
  user: string;
}