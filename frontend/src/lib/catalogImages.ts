const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

export function catalogImageSource(path?: string | null): string | undefined {
  return path?.startsWith('/api/catalog/') ? `${baseUrl}${path}` : undefined;
}
