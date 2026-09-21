import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { LinkedDevice } from '../domain/protocol';

const LINK_KEY = 'rb-mobile-v2/link';
const TOKEN_KEY = 'rb-mobile-v2/device-token';
const CODE_KEY = 'rb-mobile-v2/pairing-code';

export async function loadLinkedDevice():Promise<{ device:LinkedDevice; token:string }|null> {
  const [raw, token] = await Promise.all([AsyncStorage.getItem(LINK_KEY), SecureStore.getItemAsync(TOKEN_KEY)]);
  if (!raw || !token) return null;
  try {
    const device = JSON.parse(raw) as LinkedDevice;
    if (!device.origin || !device.installationId || !device.deviceId) return null;
    return { device, token };
  } catch { return null; }
}

export async function saveLinkedDevice(device:LinkedDevice, token:string, pairingCode:string):Promise<void> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('O PC enviou uma credencial inválida.');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  try {
    await SecureStore.setItemAsync(CODE_KEY, pairingCode);
    await AsyncStorage.setItem(LINK_KEY, JSON.stringify(device));
  } catch (error) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    throw error;
  }
}

export async function clearLinkedDevice():Promise<void> {
  await AsyncStorage.removeItem(LINK_KEY);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(CODE_KEY);
}
