export interface SyncProgressData {
  status: 'syncing' | 'ready' | 'cached';
  percentage: number;
  speedMbps: number;
  etaSeconds: number;
  layer?: string;
}
