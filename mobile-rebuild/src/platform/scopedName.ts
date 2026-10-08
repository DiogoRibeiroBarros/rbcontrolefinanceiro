import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';

export async function scopedName(scope: string): Promise<string> {
  if (!scope) throw new Error('Vínculo obrigatório para acessar dados locais.');
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, scope);
}
