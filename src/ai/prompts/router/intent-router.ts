// src/ai/router/intent-router.ts

import { EAIIntent, IIntentScore, IRouteDecision } from "src/types/ai.types";
import { fuzzyTokenMatch, phraseInText } from "./fuzzy";
import { normalizeText, tokenize } from "./text-utils";

type Signal = { key: string; weight: number; type: 'token' | 'phrase' | 'regex' };
type IntentProfile = {
  intent: EAIIntent;
  signals: Signal[];
  antiSignals?: Signal[];
};

const PROFILES: IntentProfile[] = [
  {
    intent: EAIIntent.EVN_INFO,
    signals: [
      { key: 'evn', weight: 5, type: 'token' },
      { key: 'kw', weight: 4, type: 'token' },
      { key: 'kilovat', weight: 4, type: 'token' },
      { key: 'rryme', weight: 4, type: 'token' },
      { key: 'energji', weight: 3, type: 'token' },
      { key: 'kycje', weight: 4, type: 'token' },
      { key: 'mates', weight: 3, type: 'token' },
      { key: 'sahat', weight: 3, type: 'token' },
      { key: 'rrjet', weight: 3, type: 'token' },
      { key: 'kycje rryme', weight: 6, type: 'phrase' },
      { key: 'sa kushton', weight: 2, type: 'phrase' },
      { key: '\\b(3\\.6|11|17\\.3|24\\.8)\\b', weight: 4, type: 'regex' }, 
      { key: '\\bdenar(e|ë|)\\b', weight: 3, type: 'regex' },
    ],
    antiSignals: [
      { key: 'mur', weight: 2, type: 'token' },
      { key: 'themele', weight: 2, type: 'token' },
    ],
  },
  {
    intent: EAIIntent.CONSTRUCTION_PLAN,
    signals: [
      { key: 'ndertim', weight: 4, type: 'token' },
      { key: 'renovim', weight: 4, type: 'token' },
      { key: 'shtepi', weight: 4, type: 'token' },
      { key: 'banese', weight: 3, type: 'token' },
      { key: 'projekt', weight: 3, type: 'token' },
      { key: 'plan', weight: 3, type: 'token' },
      { key: 'faza', weight: 4, type: 'token' },
      { key: 'themele', weight: 4, type: 'token' },
      { key: 'beton', weight: 3, type: 'token' },
      { key: 'armature', weight: 3, type: 'token' },
      { key: 'izolim', weight: 3, type: 'token' },
      { key: 'cati', weight: 3, type: 'token' },
      { key: '\\b(m2|m\\s?2|m²)\\b', weight: 4, type: 'regex' },
      { key: '\\b(eur|euro)\\b', weight: 2, type: 'regex' },
      { key: 'sa kushton', weight: 2, type: 'phrase' },
    ],
    antiSignals: [
      { key: 'instagram', weight: 4, type: 'token' },
      { key: 'facebook', weight: 4, type: 'token' },
      { key: 'github', weight: 4, type: 'token' },
    ],
  },
  {
    intent: EAIIntent.GREETING,
    signals: [
      { key: 'pershendetje', weight: 3, type: 'token' },
      { key: 'tung', weight: 2, type: 'token' },
      { key: 'hi', weight: 2, type: 'token' },
      { key: 'hello', weight: 2, type: 'token' },
      { key: 'si funksionon', weight: 4, type: 'phrase' },
      { key: 'cfare eshte', weight: 3, type: 'phrase' },
      { key: 'ndihme', weight: 2, type: 'token' },
    ],
  },
];

const CFG = {
  MIN_SCORE_TO_CONSIDER: 5,
  LOW_CONFIDENCE_SCORE: 6,
  GREETING_MIN_SCORE: 1, 
  DOMINANCE_RATIO: 1.5,
  COMPOSITE_MIN_SECOND: 6,
  AMBIGUOUS_GAP_MAX: 3,
  MAX_HITS_PER_SIGNAL: 2,
};


function scoreProfile(profile: IntentProfile, normalizedText: string, tokens: string[]) {
  let score = 0;
  const hits: string[] = [];

  const freq: Record<string, number> = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;

  const applySignal = (s: Signal, isAnti = false) => {
    let matched = false;
    if (s.type === 'phrase') matched = phraseInText(s.key, normalizedText);
    if (s.type === 'regex') matched = new RegExp(s.key).test(normalizedText);
    if (s.type === 'token') {
      matched = tokens.some(tok => fuzzyTokenMatch(tok, s.key));
    }

    if (!matched) return;

    let multiplier = 1;
    if (s.type === 'token') {
      const exact = freq[s.key] || 1;
      multiplier = Math.min(exact, CFG.MAX_HITS_PER_SIGNAL);
    }

    const delta = s.weight * multiplier;
    score += isAnti ? -delta : delta;
    hits.push(`${isAnti ? '-' : '+'}${s.key}`);
  };

  for (const s of profile.signals) applySignal(s, false);
  if (profile.antiSignals) for (const s of profile.antiSignals) applySignal(s, true);

  score = Math.max(0, score);
  return { score, hits };
}

function confidenceFromTopTwo(top: number, second: number): number {
  if (top <= 0) return 0;
  const gap = top - second;
  const dominance = second === 0 ? 1 : Math.min(1, top / (second * CFG.DOMINANCE_RATIO));
  const abs = Math.min(1, top / 18); 
  const gapFactor = Math.min(1, gap / 8);
  return Math.max(0, Math.min(1, 0.45 * abs + 0.35 * gapFactor + 0.20 * dominance));
}

export function routeIntent(userPrompt: string): IRouteDecision {
  const normalizedText = normalizeText(userPrompt);
  const tokens = tokenize(userPrompt);

  if (!normalizedText || normalizedText.length < 2) {
    return {
      strategy: 'CLARIFY',
      primary: EAIIntent.GREETING,
      confidence: 0.2,
      scores: [],
      reason: 'Empty/too-short input',
    };
  }

  const scored: IIntentScore[] = PROFILES.map(p => {
    const { score, hits } = scoreProfile(p, normalizedText, tokens);
    return { intent: p.intent, score, hits };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1] ?? { intent: EAIIntent.OUT_OF_SCOPE, score: 0, hits: [] };

    if (
        top.intent === EAIIntent.GREETING &&
        top.score >= CFG.GREETING_MIN_SCORE
    ) {
    return {
        strategy: 'SINGLE',
        primary: EAIIntent.GREETING,
        confidence: 0.9,
        scores: scored,
        reason: 'Greeting detected',
    };
    }

  if (top.intent === EAIIntent.GREETING && second.score >= CFG.MIN_SCORE_TO_CONSIDER) {
    return {
      strategy: 'SINGLE',
      primary: second.intent,
      confidence: confidenceFromTopTwo(second.score, top.score),
      scores: scored,
      reason: 'Greeting + meaningful intent detected; routing to intent',
    };
  }

  const conf = confidenceFromTopTwo(top.score, second.score);

  if (top.score < CFG.LOW_CONFIDENCE_SCORE) {
    return {
      strategy: 'CLARIFY',
      primary: top.intent,
      confidence: conf,
      scores: scored,
      reason: 'Low confidence (weak total evidence)',
    };
  }

  const gap = top.score - second.score;

  if (second.score === 0 || top.score >= second.score * CFG.DOMINANCE_RATIO) {
    return {
      strategy: 'SINGLE',
      primary: top.intent,
      confidence: conf,
      scores: scored,
      reason: 'Dominant intent',
    };
  }

  const compatible =
    (top.intent === EAIIntent.CONSTRUCTION_PLAN && second.intent === EAIIntent.EVN_INFO) ||
    (top.intent === EAIIntent.EVN_INFO && second.intent === EAIIntent.CONSTRUCTION_PLAN);

  if (compatible && second.score >= CFG.COMPOSITE_MIN_SECOND && gap <= CFG.AMBIGUOUS_GAP_MAX) {
    return {
      strategy: 'COMPOSITE',
      primary: top.intent,
      secondary: second.intent,
      confidence: conf,
      scores: scored,
      reason: 'Composite request (construction + EVN) detected',
    };
  }

  return {
    strategy: 'CLARIFY',
    primary: top.intent,
    secondary: second.intent,
    confidence: conf,
    scores: scored,
    reason: 'Multiple intents with no safe dominance',
  };
}
