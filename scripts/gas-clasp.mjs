/**
 * 將 clasp.test.json / clasp.prod.json 複製為 .clasp.json 後，在 google-apps-script 目錄執行 clasp。
 * 用法: node scripts/gas-clasp.mjs <push|pull|open|status|deployments> <test|prod>
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const gasDir = path.join(root, 'google-apps-script');

const cmd = process.argv[2];
const env = process.argv[3];

const validCmds = ['push', 'pull', 'open', 'status', 'deployments'];
if (!validCmds.includes(cmd) || !['test', 'prod'].includes(env)) {
  console.error('用法: node scripts/gas-clasp.mjs <push|pull|open|status|deployments> <test|prod>');
  process.exit(1);
}

const src = path.join(gasDir, `clasp.${env}.json`);
const dest = path.join(gasDir, '.clasp.json');
if (!fs.existsSync(src)) {
  console.error('找不到:', src);
  process.exit(1);
}
fs.copyFileSync(src, dest);
console.log(`[clasp] 環境=${env} → 已寫入 google-apps-script/.clasp.json`);

const r = spawnSync('npx', ['clasp', cmd], { cwd: gasDir, stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
