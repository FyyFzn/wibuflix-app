import { getApiBase } from '../apiClient';

export interface QueueItem {
  id: string;
  episodeUrl: string;
  seriesUrl?: string;
  seriesSlug: string;
  seriesTitle: string;
  episodeTitle: string;
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress?: string;
  createdAt: number;
  uniqueId?: string;
}

export async function queueAdd(episodeUrl: string, seriesUrl?: string, seriesTitle?: string, episodeTitle?: string, uniqueId?: string): Promise<{ success: boolean, item?: QueueItem }> {
  const res = await fetch(`${getApiBase()}/api/queue/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ episodeUrl, seriesUrl, seriesTitle, episodeTitle, uniqueId })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function queuePrioritize(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${getApiBase()}/api/queue/prioritize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function queueCancel(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${getApiBase()}/api/queue/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchQueueStatus(signal?: AbortSignal): Promise<{ success: boolean, queue: QueueItem[] }> {
  const res = await fetch(`${getApiBase()}/api/queue/status`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
