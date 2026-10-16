/**
 * 打包「双击即玩」的单文件 HTML。
 *
 * 为什么需要它：Vite 项目必须经由 http 服务访问；直接双击项目根目录的
 * index.html 会因为浏览器在 file:// 下禁止加载 ES 模块而白屏。
 * 本脚本把 React 应用、Tailwind 样式和全部背景图（转成 data URL）内联进
 * 一个 HTML 文件，用 file:// 打开即可游玩。
 *
 * 用法：
 *   node tools/build-standalone.mjs
 * 产物：
 *   项目根目录 `海岛奇旅-双击即玩.html`
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';

const root = resolve(import.meta.dirname, '..');
const workDir = join(root, '.standalone');
const outFile = join(root, '海岛奇旅-双击即玩.html');
const entryFile = join(workDir, 'entry.tsx');
const jsFile = join(workDir, 'app.js');

// ---------------------------------------------------------------------------
// 1) 编译 Tailwind CSS（只保留实际用到的工具类）
// ---------------------------------------------------------------------------
const cssSource = readFileSync(join(root, 'src/index.css'), 'utf8');

const compiler = await compile(cssSource, {
  base: root,
  onDependency: () => {},
});

const scanner = new Scanner({
  sources: [{ base: root, pattern: 'src/**/*.{ts,tsx,html}', negated: false }],
});
const candidates = scanner.scan();
let css = compiler.build(candidates);

// Google 字体改为 <link> 加载，避免内联的 @import 在离线时阻塞渲染
css = css.replace(/@import\s+url\([^)]*fonts\.googleapis[^)]*\);?/g, '').trim();
console.log(`• Tailwind 已编译：${candidates.length} 个候选类，CSS ${(css.length / 1024).toFixed(1)} KB`);

// ---------------------------------------------------------------------------
// 2) 用 esbuild 打包 JS（背景图内联成 data URL）
// ---------------------------------------------------------------------------
mkdirSync(workDir, { recursive: true });
writeFileSync(
  entryFile,
  [
    "import { createRoot } from 'react-dom/client';",
    "import App from '../src/App.tsx';",
    "createRoot(document.getElementById('root')).render(<App />);",
    '',
  ].join('\n'),
  'utf8'
);

const esbuildBin = join(root, 'node_modules', 'esbuild', 'bin', 'esbuild');
execFileSync(
  process.execPath,
  [
    esbuildBin,
    entryFile,
    '--bundle',
    `--outfile=${jsFile}`,
    '--jsx=automatic',
    '--loader:.jpg=dataurl',
    '--loader:.png=dataurl',
    '--loader:.svg=dataurl',
    '--format=esm',
    '--target=es2020',
    '--minify',
    // 保留中文原文，避免被转义成 \uXXXX（体积更小，也便于排查）
    '--charset=utf8',
    "--define:process.env.NODE_ENV=\"production\"",
    '--log-level=warning',
  ],
  { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] }
);

const js = readFileSync(jsFile, 'utf8');
console.log(`• JS 已打包：${(js.length / 1024 / 1024).toFixed(2)} MB（含内联背景图）`);

// ---------------------------------------------------------------------------
// 3) 组装单文件 HTML
// ---------------------------------------------------------------------------
const htmlSource = readFileSync(join(root, 'index.html'), 'utf8');
const title = /<title>([\s\S]*?)<\/title>/.exec(htmlSource)?.[1] ?? '海岛奇旅';
const description =
  /<meta\s+name="description"\s+content="([^"]*)"/.exec(htmlSource)?.[1] ??
  '画风精美的横版热带海岛探索小游戏';

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap"
      rel="stylesheet"
    />
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
${js}
    </script>
  </body>
</html>
`;

writeFileSync(outFile, html, 'utf8');

// 清理中间产物
rmSync(workDir, { recursive: true, force: true });

const sizeMb = (Buffer.byteLength(html, 'utf8') / 1024 / 1024).toFixed(2);
console.log('');
console.log(`✅ 已生成：${basename(outFile)}（${sizeMb} MB）`);
if (!existsSync(outFile)) process.exit(1);
console.log('   直接双击该文件即可游玩，无需启动任何本地服务。');
