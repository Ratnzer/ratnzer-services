export function generateShortId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

