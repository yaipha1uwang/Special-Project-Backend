import { serve } from '@hono/node-server';
import 'dotenv/config';
import app from './index.js';
const port = process.env.PORT ? parseInt(process.env.PORT) : 4001;
console.log(`Starting API server on port ${port}...`);
serve({
    fetch: app.fetch,
    port,
});
