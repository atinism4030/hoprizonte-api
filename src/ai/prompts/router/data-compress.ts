export function compressIndustries(industries: any[], max = 60): string {
  const names = industries
    .map(i => (typeof i === 'string' ? i : i?.name))
    .filter(Boolean)
    .slice(0, max);
  return names.join(', ');
}

export function compressCompanies(companies: any[], maxIndustries = 18, maxCompaniesPerIndustry = 12): string {
  const grouped = new Map<string, string[]>();

  for (const c of companies) {
    const industry = (c?.industry ?? c?.industryName ?? 'Other').toString();
    const name = (c?.name ?? '').toString().trim();
    if (!name) continue;

    if (!grouped.has(industry)) grouped.set(industry, []);
    const arr = grouped.get(industry)!;
    if (arr.length < maxCompaniesPerIndustry) arr.push(name);
  }

  const entries = Array.from(grouped.entries()).slice(0, maxIndustries);
  return entries.map(([ind, names]) => `${ind}: ${names.join(', ')}`).join('\n');
}
