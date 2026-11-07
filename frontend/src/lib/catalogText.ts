export function normalizeCatalogName(value: string): string {
  const text = normalizeCatalogText(value);
  return text.charAt(0).toLocaleUpperCase('vi') + text.slice(1);
}

export function normalizeCatalogText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t\u00a0 ]+/g, ' ').trim())
    .join('\n')
    .trim();
}

function searchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function distance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 0; i < left.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < right.length; j++)
      next.push(
        Math.min(next[j] + 1, previous[j + 1] + 1, previous[j] + (left[i] === right[j] ? 0 : 1)),
      );
    previous = next;
  }
  return previous[right.length];
}

export function catalogMatchScore(value: string, query: string): number {
  const text = searchText(value);
  const term = searchText(query);
  if (!term || text === term) return 0;
  if (text.includes(term)) return 1;
  const words = text.split(' ');
  return term
    .split(' ')
    .every((part) =>
      words.some(
        (word) =>
          word.includes(part) ||
          (part.length >= 3 &&
            Math.abs(word.length - part.length) <= 2 &&
            distance(word, part) <= (part.length >= 6 ? 2 : 1)),
      ),
    )
    ? 2
    : -1;
}

export function rankCatalog<T>(
  items: T[],
  query: string,
  text: (item: T) => string | string[],
): T[] {
  return items
    .map((item) => {
      const value = text(item);
      const scores = (Array.isArray(value) ? value : [value])
        .map((field) => catalogMatchScore(field, query))
        .filter((score) => score >= 0);
      return { item, score: scores.length ? Math.min(...scores) : -1 };
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => a.score - b.score)
    .map(({ item }) => item);
}
