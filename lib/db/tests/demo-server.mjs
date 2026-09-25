import { bundle } from './build.mjs';
import { fileURLToPath,pathToFileURL } from 'node:url';
process.env.NODE_ENV='test';process.env.SESSION_SECRET='local-test-secret-never-production';
process.env.APP_URL='http://127.0.0.1:5099';
process.env.DOMUS_TEST_ROOT=fileURLToPath(new URL('../../../',import.meta.url));
await import(pathToFileURL(await bundle('lib/db/tests/demo-entry.ts','demo')).href);
