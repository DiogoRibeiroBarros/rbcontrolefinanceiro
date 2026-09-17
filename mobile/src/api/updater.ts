export type MobileReleaseAsset = { name:string; browser_download_url:string; size?:number };
export type MobileRelease = { tag_name:string; name?:string; body?:string; published_at?:string; assets:MobileReleaseAsset[] };

export const MOBILE_VERSION = '1.1.28';
export const MOBILE_RELEASE_API = 'https://api.github.com/repos/PandaRaivoso/rbcontrolefinanceiro/releases?per_page=100';

export function parseMobileVersion(tag:string): [number,number,number] | null {
  const match = /^vMB\.(\d+)\.(\d+)\.(\d+)$/.exec(String(tag || ''));
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}
export function compareVersions(left:[number,number,number], right:[number,number,number]) {
  for (let index = 0; index < 3; index += 1) if (left[index] !== right[index]) return left[index] - right[index];
  return 0;
}
export function isNewerMobileRelease(tag:string, current = MOBILE_VERSION) {
  const candidate = parseMobileVersion(tag); const installed = current.split('.').map(Number) as [number,number,number];
  return Boolean(candidate && compareVersions(candidate, installed) > 0);
}

export async function findLatestMobileRelease(current = MOBILE_VERSION, fetcher: typeof fetch = fetch): Promise<MobileRelease | null> {
  const response = await fetcher(MOBILE_RELEASE_API, { headers:{ Accept:'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`GitHub respondeu com erro ${response.status}.`);
  const releases = await response.json() as MobileRelease[];
  return releases.filter(item => isNewerMobileRelease(item.tag_name, current) && item.assets.some(asset => /\.apk$/i.test(asset.name)))
    .sort((a,b) => compareVersions(parseMobileVersion(b.tag_name)!, parseMobileVersion(a.tag_name)!))[0] || null;
}
