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
  if (!url) return 'Unknown';
  try {
    const match = url.match(/https?:\/\/(?:www\.)?([^\.]+)\./i);
    if (match && match[1]) {
       return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
  } catch (e) {}
  
  if (url.startsWith('/anime/')) return 'Otakudesu';
  return 'Unknown';
}
