import type { LinkedDevice } from './protocol';

// A device credential is bound to one server/base, unlike the shared service ID.
export function connectionScope(device: LinkedDevice): string {
  return JSON.stringify([device.origin, device.installationId, device.deviceId]);
}

export function assertLinkedBase(device: LinkedDevice, result: { tenantId?: string; deviceId?: string }): void {
  if ((result.deviceId && result.deviceId !== device.deviceId) ||
      (device.tenantId && result.tenantId !== device.tenantId)) {
    throw new Error('A resposta pertence a outra base. Reconecte com o código da conta correta.');
  }
}
