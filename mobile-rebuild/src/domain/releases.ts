export type ReleaseAsset = { name:string; size:number; digest?:string; browser_download_url:string };
export type Release = { tag_name:string; name?:string; body?:string; assets:ReleaseAsset[]; draft?:boolean };
const REPO = 'https://api.github.com/repos/PandaRaivoso/rbcontrolefinanceiro/releases?per_page=100';

export function mobileNumbers(tag:string): number[] | null {
  const match = /^vMB\.(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
  return match ? match.slice(1).map(Number) : null;
}

export function compareMobileVersions(a:string, b:string): number {
  const left = mobileNumbers(a), right = mobileNumbers(b);
  if (!left || !right) throw new Error('Versão Mobile inválida.');
  for (let i=0; i<3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}

export function latestMobileRelease(releases:Release[], installed:string): { release:Release; asset:ReleaseAsset } | null {
  return releases.filter(release => !release.draft && mobileNumbers(release.tag_name) && compareMobileVersions(release.tag_name, installed) > 0)
    .map(release => ({ release, asset:release.assets.find(asset => /^RB_Gestao_Financeira_Mobile_.*\.apk$/i.test(asset.name) && /^sha256:[a-f0-9]{64}$/i.test(asset.digest || '')) }))
    .filter((item): item is { release:Release; asset:ReleaseAsset } => Boolean(item.asset))
    .sort((a,b) => compareMobileVersions(b.release.tag_name, a.release.tag_name))[0] || null;
}

export async function checkMobileRelease(installed:string, fetcher:typeof fetch = fetch):Promise<{release:Release; asset:ReleaseAsset}|null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(REPO, { headers:{Accept:'application/vnd.github+json'}, signal:controller.signal });
    if (!response.ok) throw new Error(`Consulta de versões falhou (${response.status}).`);
    return latestMobileRelease(await response.json(), installed);
  } finally { clearTimeout(timer); }
}
