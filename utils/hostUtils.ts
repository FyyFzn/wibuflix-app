import { ServerItem } from '../services/api';

/**
 * Mendapatkan nama host canonical dari ServerItem.
 * Digunakan untuk pengelompokan server dan prioritas pemutaran.
 */
export function getHostName(srv: ServerItem): string {
  if (srv.namaHost) {
    let host = srv.namaHost.toLowerCase();
    if (host.includes('vidlion')) host = 'vidhide';
    else if (host.includes('bili') || host.includes('bstation')) host = 'bilibili';
    else if (host.includes('gdrive') || host.includes('google')) host = 'gdrive';
    else if (host.includes('kraken')) host = 'krakenfiles';
    else if (host.includes('wibu')) host = 'wibufile';
    return host;
  }
  
  const nama = srv.nama || '';
  const parts = nama.split('·');
  let candidate = (parts[parts.length - 1].trim().split(' ')[0] || 'unknown').toLowerCase();
  
  if (candidate.includes('vidlion')) candidate = 'vidhide';
  else if (candidate.includes('bili') || candidate.includes('bstation')) candidate = 'bilibili';
  else if (candidate.includes('gdrive') || candidate.includes('google')) candidate = 'gdrive';
  else if (candidate.includes('kraken')) candidate = 'krakenfiles';
  else if (candidate.includes('wibu')) candidate = 'wibufile';

  if (!candidate || candidate === 'server' || candidate === 'unknown') {
    candidate = 'alternatif';
  }
  
  if (srv.source && srv.source === 'Otakudesu') {
    candidate = `[otaku] ${candidate}`;
  }
  
  return candidate;
}
