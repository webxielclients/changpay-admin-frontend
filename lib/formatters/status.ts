export function formatStatusLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Unknown';
  return raw.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
