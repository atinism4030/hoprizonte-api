export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const v0 = new Array(b.length + 1).fill(0);
  const v1 = new Array(b.length + 1).fill(0);

  for (let i = 0; i < v0.length; i++) v0[i] = i;

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,        
        v0[j + 1] + 1,    
        v0[j] + cost      
      );
    }
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

export function fuzzyTokenMatch(token: string, candidate: string): boolean {
  if (token === candidate) return true;
  const len = Math.max(token.length, candidate.length);
  if (len <= 4) return levenshtein(token, candidate) <= 1;
  if (len <= 7) return levenshtein(token, candidate) <= 2;
  if (len <= 12) return levenshtein(token, candidate) <= 3;
  return false;
}

export function phraseInText(phrase: string, normalizedText: string): boolean {
  return normalizedText.includes(phrase);
}
