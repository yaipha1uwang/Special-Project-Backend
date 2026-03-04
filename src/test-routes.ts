import { readFileSync } from 'fs';
import { resolve, join } from 'path';

const file = readFileSync(resolve('src/api/profile/password/route.js'), 'utf-8');
console.log('File size:', file.length);

import { api, API_BASENAME } from './__create/route-builder.ts';
setTimeout(() => {
    console.log(api.routes.map(r => r.method + " " + API_BASENAME + r.path));
}, 1000);
