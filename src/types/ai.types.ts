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

export enum EAIIntent {
  CONSTRUCTION_PLAN = 'CONSTRUCTION_PLAN',
  EVN_INFO = 'EVN_INFO',
  GREETING = 'GREETING',
  OUT_OF_SCOPE = 'OUT_OF_SCOPE',
}

export type TRouteStrategy = 'SINGLE' | 'COMPOSITE' | 'CLARIFY' | 'OUT_OF_SCOPE';

export interface IIntentScore {
  intent: EAIIntent;
  score: number;
  hits: string[];
}

export interface IRouteDecision {
  strategy: TRouteStrategy;
  primary: EAIIntent;
  secondary?: EAIIntent;
  confidence: number; 
  scores: IIntentScore[];
  reason: string;
}
