// apps/api/src/__create/vercel.ts
import { handle } from 'hono/vercel';
import app from './index.js'; // Ensure this points to your main exported Hono app
// Vercel expects us to export HTTP methods
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
