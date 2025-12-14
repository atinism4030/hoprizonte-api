export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')                
    .replace(/[\u0300-\u036f]/g, '')  
    .replace(/[^a-z0-9\s]/g, ' ')    
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string, maxTokens = 80): string[] {
  const t = normalizeText(input);
  if (!t) return [];
  const raw = t.split(' ');
  return raw.slice(0, maxTokens);
}
