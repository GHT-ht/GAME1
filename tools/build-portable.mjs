/**
 * Linux/Windows independent offline HTML packaging using the TypeScript parser.
 * This is a simple CommonJS bundler for the game's static module tree, used
 * when the supplied node_modules contains Windows-only esbuild binaries.
 * Unlike Vite production output this is unminified and can be bigger.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
catch { ts = require('typescript'); }
const root = resolve(import.meta.dirname,'..');
const original = readFileSync(join(root,'海岛奇旅-双击即玩.html'),'utf8');
const css = (/<style>([\s\S]*?)<\/style>/.exec(original)?.[1] || '') + '\n@media(min-width:768px){.mobile-only-controls{display:none!important}}\n';
if (!css) throw new Error('Cannot find old standalone CSS');
const modules=[];const cache=new Map();
const sourceExt=/\.(ts|tsx|jsx)$/;
function put(file){
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const id=modules.length;cache.set(file,id);modules.push(null);
  const extension=extname(file).toLowerCase();
  let body=readFileSync(file,'utf8');
  if (/\.(jpg|jpeg|png|webp|svg)$/.test(extension)) {
    const types={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
    body = `module.exports=${JSON.stringify('data:'+types[extension]+';base64,'+readFileSync(file).toString('base64'))};`;
  } else if (sourceExt.test(file)) {
    body=ts.transpileModule(body,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,removeComments:true}}).outputText;
  }
  const mapping={};
  const regex=/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;let match;
  while((match=regex.exec(body))!==null){
    const spec=match[1];
    if (spec.startsWith('node:')) throw new Error(`Browser cannot require ${spec} from ${file}`);
    if (mapping[spec]===undefined){
      let sub;
      try { sub=createRequire(file).resolve(spec); }
      catch(e){throw new Error(`Cannot resolve ${spec} from ${file}: ${e.message}`);}
      if (spec.endsWith('.css')) continue;
      mapping[spec]=put(sub);
    }
  }
  modules[id]={body,mapping,file};return id;
}
const entry=join(root,'src','main.tsx');
const entrySrc=readFileSync(entry,'utf8').replace(/import ['"]\.\/index\.css['"];?/,'');
const tmpFile=join(root,'src','__offline_entry.tsx');
// main.tsx is imported as a virtual patched module to avoid modifying the project.
const mainBody=ts.transpileModule(entrySrc,{fileName:entry,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
// We need the patched entry body to resolve App.tsx normally.
const entryId=modules.length;cache.set(tmpFile,entryId);modules.push(null);
const map={};for(const m of mainBody.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)){
  map[m[1]]=put(createRequire(entry).resolve(m[1]));
}
modules[entryId]={body:mainBody,mapping:map,file:entry};
const packed=modules.map((m,i)=>`/* ${i}: ${m.file.replace(root+'/','')} */\nfunction(require,module,exports){\n${m.body}\n}`).join(',\n');
const ids=modules.map(m=>m.mapping);
const bundled=`const __gameModules=[\n${packed}\n];\nconst __gameDeps=${JSON.stringify(ids)};\nconst __gameCache={};\nfunction __gameLoad(id){if(__gameCache[id])return __gameCache[id].exports;const mod={exports:{}};__gameCache[id]=mod;const imp=name=>{const sub=__gameDeps[id][name];if(sub===undefined)throw Error('Missing dependency '+name+' in '+id);return __gameLoad(sub)};__gameModules[id](imp,mod,mod.exports);return mod.exports;}\n__gameLoad(${entryId});`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>海岛奇旅 · 蓄力弹跳与战斗升级版</title><style>${css}</style></head><body><div id="root"></div><script>var process={env:{NODE_ENV:'production'}};${bundled.replaceAll('</script','<\\/script')}</script></body></html>`;
const dest=join(root,'海岛奇旅-升级版-双击即玩.html');
writeFileSync(dest,html);
console.log('Portable offline HTML:',dest,'modules:',modules.length,'sizeMB:',(html.length/1048576).toFixed(2));
