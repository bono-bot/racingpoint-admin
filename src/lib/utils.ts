import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatLapTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display label for a pod. Shows "POS" for point-of-sale terminal, "Pod N" for racing pods. */
export function podLabel(pod: { pod_number: number; node_type?: string; name?: string }): string {
  if (pod.node_type === 'pos') return pod.name ?? 'POS';
  return `Pod ${pod.pod_number}`;
}
