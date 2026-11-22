const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });

const suffixes: Record<string, string> = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
};

export function formatOrdinal(num: number): string {
  const rule = pr.select(num);
  return `${num}${suffixes[rule]}`;
}
