const fs = require('node:fs');
const path = require('node:path');

const backupDir = path.join(process.env.USERPROFILE, 'Documents', 'RB Gestão Financeira', 'Backups');
const latestPath = path.join(backupDir, 'RB_Gestao_Backup_2026-08-30_21-33-15-060_fechamento.json');
const sourcePath = path.join(backupDir, 'RB_Gestao_Backup_2026-08-29_04-27-28-264_fechamento.json');
const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function unionById(older, newer) {
  const values = new Map();
  (older || []).forEach(item => values.set(item.id, item));
  (newer || []).forEach(item => values.set(item.id, item));
  return Array.from(values.values());
}

latest.profileStore.profiles = unionById(source.profileStore.profiles, latest.profileStore.profiles);
const targetData = latest.profileStore.sharedData;
const sourceData = source.profileStore.sharedData;
targetData.loans = unionById(sourceData.loans, targetData.loans);
targetData.subscriptions = unionById(sourceData.subscriptions, targetData.subscriptions);
latest.exportedAt = new Date().toISOString();
latest.recovery = {
  createdAt: latest.exportedAt,
  latestSource: latestPath,
  recoveredSource: sourcePath,
  recoveredCollections: ['profiles', 'loans', 'subscriptions']
};

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(backupDir, `RB_Gestao_RECUPERACAO_${stamp}.json`);
fs.writeFileSync(output, JSON.stringify(latest, null, 2), 'utf8');
console.log(output);
