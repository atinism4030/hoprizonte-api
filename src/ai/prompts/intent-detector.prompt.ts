import { EAIIntent } from "src/types/ai.types";

type SignalGroup = {
  intent: EAIIntent;
  score: number;
};

const SIGNALS = {
  CONSTRUCTION_PLAN: [
    'ndertim', 'ndërtim', 'renovim', 'shtepi', 'shtëpi', 'banese', 'banesë',
    'themele', 'kolona', 'beton', 'armatur', 'faza', 'kosto', 'buxhet',
    'material', 'punime', 'projekt', 'plan', 'm2', 'metra', 'kat',
    'çati', 'kulm', 'izolim', 'instalim'
  ],

  EVN_INFO: [
    'rryme', 'rrymë', 'energji', 'kw', 'kilovat',
    'evn', 'kycje', 'kyçje', 'lidhje', 'matës', 'sahat',
    'furnizim', 'rrjet'
  ],

  GREETING: [
    'pershendetje', 'përshëndetje', 'hi', 'hello', 'tung',
    'cfare eshte', 'çfarë është', 'si funksionon', 'help'
  ],
};

export function detectIntent(prompt: string): EAIIntent {
  const text = prompt.toLowerCase();

  const scores: Record<EAIIntent, number> = {
    [EAIIntent.CONSTRUCTION_PLAN]: 0,
    [EAIIntent.EVN_INFO]: 0,
    [EAIIntent.GREETING]: 0,
    [EAIIntent.OUT_OF_SCOPE]: 0,
  };

  for (const word of SIGNALS.CONSTRUCTION_PLAN) {
    if (text.includes(word)) scores[EAIIntent.CONSTRUCTION_PLAN] += 2;
  }

  for (const word of SIGNALS.EVN_INFO) {
    if (text.includes(word)) scores[EAIIntent.EVN_INFO] += 3;
  }

  for (const word of SIGNALS.GREETING) {
    if (text.includes(word)) scores[EAIIntent.GREETING] += 1;
  }

  // 🔒 Priority rules
  if (scores[EAIIntent.EVN_INFO] >= 3) return EAIIntent.EVN_INFO;
  if (scores[EAIIntent.CONSTRUCTION_PLAN] >= 2) return EAIIntent.CONSTRUCTION_PLAN;
  if (scores[EAIIntent.GREETING] >= 1) return EAIIntent.GREETING;

  return EAIIntent.OUT_OF_SCOPE;
}
