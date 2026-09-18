export function matchesCollectionSearch(query: string, ...labels: (string | undefined)[]) {
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const text = normalize(labels.filter(Boolean).join(' '));
  return normalize(query)
    .split(/\s+/)
    .every((word) => text.includes(word));
}
export function groupByKind<T extends { kind: string }>(items: T[]) {
  const groups = new Map<T['kind'], T[]>();
  for (const item of items) {
    const group = groups.get(item.kind) ?? [];
    group.push(item);
    groups.set(item.kind, group);
  }
  return [...groups].map(([kind, items]) => ({ kind, items }));
}
