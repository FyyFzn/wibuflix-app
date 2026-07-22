/**
 * Helper to dynamically get the first available URL from an episode object
 * regardless of the provider name.
 */
export function getPrimaryUrl(item: any): string {
  if (!item) return '';
  if (item.url) return item.url;
  if (item.urls && typeof item.urls === 'object') {
    const vals = Object.values(item.urls).filter(Boolean);
    if (vals.length > 0) return vals[0] as string;
  }
  return '';
}

export function getProviderNameFromUrl(url: string): string {
  if (!url) return 'Samehadaku';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('otakudesu') || lowerUrl.startsWith('/anime/')) return 'Otakudesu';
  if (lowerUrl.includes('kuronime')) return 'Kuronime';
  if (lowerUrl.includes('nanime')) return 'Nanime';
  if (lowerUrl.includes('neosatsu')) return 'Neosatsu';
  if (lowerUrl.includes('nimegami')) return 'Nimegami';
  if (lowerUrl.includes('oploverz')) return 'Oploverz';
  if (lowerUrl.includes('ylnime')) return 'YLnime';
  return 'Samehadaku';
}
