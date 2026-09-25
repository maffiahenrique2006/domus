import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const serverRequire=createRequire(new URL('../../../artifacts/api-server/package.json',import.meta.url));
const {build}=serverRequire('esbuild');
const root=fileURLToPath(new URL('../../../',import.meta.url));
export async function bundle(entry,name){
 const outfile=`${root}lib/db/tests/.generated/${name}.mjs`;
 await build({entryPoints:[`${root}${entry}`],outfile,bundle:true,platform:'node',format:'esm',target:'node22',external:['@electric-sql/pglite'],nodePaths:[`${root}artifacts/api-server/node_modules`],
  banner:{js:"import { createRequire as __createRequire } from 'node:module';const require=__createRequire(import.meta.url);"},
  alias:{'@workspace/db':`${root}lib/db/tests/adapter.ts`},
  plugins:[{name:'silent-test-logger',setup(b){b.onResolve({filter:/lib\/logger$|\.\/logger$/},()=>({path:'logger',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`import pino from 'pino';export const logger=pino({level:'silent'});`,resolveDir:`${root}artifacts/api-server`}));}}],
 });return outfile;
}
