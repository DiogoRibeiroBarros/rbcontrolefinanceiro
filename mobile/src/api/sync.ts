import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../types';

export type SyncConfiguration = { baseUrl: string; accessToken: string };
export type SyncResult = { synchronizedAt: string; mode: 'remote' | 'offline'; message: string; snapshot?: unknown };

const CONFIG_KEY = '@rb-gestao/mobile-sync-config';
const normalizeUrl = (value: string) => value.trim().replace(/\/$/, '');
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function loadSyncConfiguration(): Promise<SyncConfiguration> {
  const raw = await AsyncStorage.getItem(CONFIG_KEY);
  if (!raw) return { baseUrl: '', accessToken: '' };
  try { const value = JSON.parse(raw); return { baseUrl: normalizeUrl(String(value.baseUrl || '')), accessToken: String(value.accessToken || '') }; }
  catch { return { baseUrl: '', accessToken: '' }; }
}

export async function saveSyncConfiguration(config: SyncConfiguration) {
  const normalized = { baseUrl: normalizeUrl(config.baseUrl), accessToken: config.accessToken.trim() };
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(normalized));
  return normalized;
}

async function request(config: SyncConfiguration, path: string, init?: RequestInit) {
  if (!config.baseUrl) throw new Error('Configure a URL segura do RB Gestão desktop.');
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (config.accessToken) headers.set('Authorization', `Bearer ${config.accessToken}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try { response = await fetch(`${normalizeUrl(config.baseUrl)}${path}`, { ...init, headers, signal:controller.signal }); }
  finally { clearTimeout(timeout); }
  if (!response.ok) throw new Error(response.status === 401 ? 'A chave de acesso foi recusada pelo desktop.' : `O desktop respondeu com erro ${response.status}.`);
  return response.status === 204 ? null : response.json();
}

export function isTransportConnectionError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause || '');
  return /fetch failed|network request failed|sslhandshake|connection closed|failed to connect|abort|timeout/i.test(message);
}

export async function testConnection(config: SyncConfiguration) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const data = await request(config, '/health');
      if (!data?.ok) throw new Error('O endereço não é um servidor RB Gestão válido.');
      return data;
    } catch (cause) {
      lastError = cause;
      if (!isTransportConnectionError(cause) || attempt === 2) throw cause;
      await wait(500 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function synchronize(config: SyncConfiguration, pendingTransactions: Transaction[] = []): Promise<SyncResult> {
  if (!config.baseUrl) return { synchronizedAt: '', mode: 'offline', message: 'Conexão com o desktop ainda não configurada.' };
  if (pendingTransactions.length) await request(config, '/v1/sync', { method: 'POST', body: JSON.stringify({ transactions: pendingTransactions }) });
  const data = await request(config, '/v1/sync');
  return { synchronizedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), mode: 'remote', message: data?.message || 'Dados recebidos do desktop.', snapshot: data?.snapshot };
}
