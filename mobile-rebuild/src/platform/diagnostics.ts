import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rb-mobile-v2/logs';
export type LogEntry = { at:string; event:string; detail:string };
const allowed = new Set(['startup','pair_request','pair_pending','pair_approved','pair_denied','connected','disconnected','reconnecting','timeout','api_error','update_check','update_found','download_start','download_progress','download_error','install_requested','session_error']);

export async function writeLog(event:string, detail = ''):Promise<void> {
  if (!allowed.has(event)) return;
  const safeDetail = String(detail).replace(/https?:\/\/\S+|\b\d{6}\b|Bearer\s+\S+|[A-Za-z0-9_-]{43}/g, '[omitido]').slice(0, 120);
  try {
    const current = JSON.parse(await AsyncStorage.getItem(KEY) || '[]') as LogEntry[];
    current.push({ at:new Date().toISOString(), event, detail:safeDetail });
    await AsyncStorage.setItem(KEY, JSON.stringify(current.slice(-150)));
  } catch { /* Logs must never interrupt pairing or finance data. */ }
}

export async function readLogs():Promise<LogEntry[]> {
  try { return JSON.parse(await AsyncStorage.getItem(KEY) || '[]') as LogEntry[]; }
  catch { return []; }
}
