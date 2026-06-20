# Stock Research App — Ready

## Problem: Internal Server Error (500)

The app was returning **500 Internal Server Error** at runtime even though the build (`npm run build`) succeeded.

## Root Cause

Module-level initialization of Genkit in `src/actions/company-actions.ts`:

```ts
import { ai } from '@/ai/genkit';  // ← This ran genkit() at import time
```

When Next.js loaded the server action module, the `genkit()` + `googleAI()` setup executed immediately. If the Gemini API key wasn't available at module load time or if the plugin initialization failed, the entire module would crash — causing a 500 error on any server action call.

## Fix Applied

**File: `src/actions/company-actions.ts`**

1. **Removed** the top-level imports:
   - `import { ai } from '@/ai/genkit'`
   - `import { z } from 'genkit'`

2. **Replaced** `getSwotPrompt()` with a lazy async version:
   ```ts
   let swotPromptCache: any = null;
   async function getSwotPrompt() {
     if (swotPromptCache) return swotPromptCache;
     // Dynamically imports genkit + googleAI only when needed
     const { genkit } = await import('genkit');
     const { googleAI } = await import('@genkit-ai/googleai');
     ...
   }
   ```

3. **Updated callers** to `await getSwotPrompt()` (since it's now async).

## Result

- ✅ **Build:** `npm run build` — compiles successfully
- ✅ **Dev server:** `npm run dev —turbopack -p 9002` — starts and serves
- ✅ **Homepage:** Returns `200 OK`
- ✅ **SWOT analysis:** Only initializes Genkit when the user actually requests analysis

## Run Commands

```bash
npm run dev          # Dev server at http://localhost:9002
npm run build        # Production build
npm start            # Production server
```

## Environment

Set `GEMINI_API_KEY` in `.env.local` for AI-powered SWOT analysis:
```
GEMINI_API_KEY=your_key_here
```
