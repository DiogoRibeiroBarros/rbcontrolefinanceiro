import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import type { ReleaseAsset } from '../domain/releases';

export async function downloadAndOpenApk(asset:ReleaseAsset, onProgress:(value:number)=>void):Promise<void> {
  if (Platform.OS !== 'android') throw new Error('A instalação de APK está disponível somente no Android.');
  if (!/^https:\/\//.test(asset.browser_download_url) || !/^sha256:[a-f0-9]{64}$/i.test(asset.digest || '')) throw new Error('Arquivo ou assinatura SHA-256 indisponível.');
  if (!asset.size || asset.size > 250*1024*1024) throw new Error('Tamanho do APK inválido.');
  const destination = new File(Paths.cache, 'rb-gestao-mobile-update.apk');
  const download = LegacyFileSystem.createDownloadResumable(asset.browser_download_url, destination.uri, {}, progress => {
    if (progress.totalBytesExpectedToWrite > 0) onProgress(Math.min(100, Math.round(progress.totalBytesWritten * 100 / progress.totalBytesExpectedToWrite)));
  });
  const saved = await download.downloadAsync();
  if (!saved || !destination.exists || destination.size !== asset.size) throw new Error('O download do APK ficou incompleto.');
  const bytes = await destination.bytes();
  const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const actual = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('');
  if (actual.toLowerCase() !== asset.digest!.slice(7).toLowerCase()) { destination.delete(); throw new Error('O APK não passou na verificação de integridade.'); }
  const uri = await LegacyFileSystem.getContentUriAsync(destination.uri);
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data:uri, type:'application/vnd.android.package-archive', flags:1 | 0x10000000
    });
  } catch {
    if (Application.applicationId) await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES',{data:`package:${Application.applicationId}`});
    throw new Error('Autorize “Instalar apps desconhecidos” para o RB Gestão e toque em Atualizar novamente.');
  }
}
