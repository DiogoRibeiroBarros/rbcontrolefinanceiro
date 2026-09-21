export type Connectivity = 'checking' | 'connected' | 'reconnecting' | 'pc_offline' | 'no_internet' | 'auth_error' | 'awaiting_pc' | 'timeout';
export type PairRequest = { requestId:string; requestSecret:string; expiresIn:number; installationId:string };
export type LinkedDevice = { origin:string; installationId:string; deviceId:string; name:string };

export class ApiError extends Error {
  constructor(public readonly reason: string, public readonly status: number, message: string) { super(message); }
}

export async function requestJson<T>(origin: string, route: string, options: { method?:string; body?:unknown; token?:string; timeoutMs?:number; fetcher?:typeof fetch } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
  let response: Response;
  try {
    response = await (options.fetcher || fetch)(`${origin}${route}`, {
      method:options.method || 'GET',
      headers:{ Accept:'application/json', ...(options.body ? { 'Content-Type':'application/json' } : {}), ...(options.token ? { Authorization:`Bearer ${options.token}` } : {}) },
      body:options.body ? JSON.stringify(options.body) : undefined,
      signal:controller.signal
    });
  } catch (error) {
    throw new ApiError((error as Error)?.name === 'AbortError' ? 'timeout' : 'network', 0, (error as Error)?.name === 'AbortError' ? 'O PC demorou a responder.' : 'Não foi possível alcançar o PC.');
  } finally { clearTimeout(timer); }
  let data: Record<string, unknown>;
  try { data = await response.json(); }
  catch { throw new ApiError('invalid_response', response.status, 'O PC enviou uma resposta inválida.'); }
  if (!response.ok) throw new ApiError(String(data.reason || 'server_error'), response.status, String(data.message || `O PC respondeu com erro ${response.status}.`));
  return data as T;
}

export function classifyConnection(error: unknown, hasInternet: boolean): Connectivity {
  if (!hasInternet) return 'no_internet';
  if (error instanceof ApiError && error.status === 401) return 'auth_error';
  if (error instanceof ApiError && error.reason === 'timeout') return 'timeout';
  return 'pc_offline';
}
