# Zero-spend provider and hosting research

Researched **2026-10-23**, using official documentation. Ayham chose **Groq free tier**. Free quotas and availability are account-dependent and can change; these findings are not a guarantee of perpetual free service.

## AI providers

| Option | Verified free path | Fit and decision |
| --- | --- | --- |
| Groq | Published free-plan limits for `openai/gpt-oss-120b`: 30 RPM, 1,000 RPD, 8k TPM, 200k TPD; account console is authoritative | Selected: strong structured-output boundary, quick short-document workflow; tight TPM means pacing is necessary |
| Cloudflare Workers AI | 10,000 neurons/day included on Workers Free; excess requires an upgrade | Good alternative for an existing account; supported Qwen adapter included; neuron allowance depends on model/input/output, not a fixed request count |
| Gemini Developer API | Free input/output for eligible models with project/model quotas | Viable, but free-tier content handling needs attention; not selected for this implementation |
| OpenAI hosted API | Usage-based token pricing; an API key is an authentication mechanism, not a free inference entitlement | Excluded from the zero-spend default; no OpenAI key or paid fallback required |

Groq's model name begins `openai/` because it identifies an open-weight model hosted by Groq. Requests go to `api.groq.com`, with a Groq credential. This does not use the separately billed OpenAI API.

The application reserves estimated input plus output tokens, applies session/day and service/day limits, and returns useful errors on free-provider exhaustion. It does not rotate accounts/keys to bypass limits, upgrade billing, or silently route to paid services. Groq returns 429 when its own authoritative limits are exceeded. The duplicate fixed-minute app guard was removed on 2026-10-24 because conservative reservations blocked sequential requests despite remaining provider capacity. Provider `retry-after` and token/request reset headers now supply a visible countdown. Cached tokens can also reduce provider quota consumption, so a full reservation cannot represent remaining provider capacity. [Groq rate limits](https://console.groq.com/docs/rate-limits) and [prompt caching](https://console.groq.com/docs/prompt-caching) were rechecked for this change. The app does not retry automatically or change providers.

Official evidence: [Groq rate limits](https://console.groq.com/docs/rate-limits), [strict structured output support](https://console.groq.com/docs/structured-outputs), [Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Qwen model](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/), [Cloudflare JSON schema](https://developers.cloudflare.com/workers-ai/features/json-mode/), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [OpenAI API pricing](https://developers.openai.com/api/docs/pricing).

## Hosting and persistent storage

Select **Vercel Hobby + Neon Free** for this personal recruitment demonstration, subject to account eligibility and Hobby's personal/non-commercial restriction. No custom domain is needed. Never choose the Pro trial or add billing as part of this task.

Vercel's documented function payload cap is 4.5 MB, so SourceNote uses a 4 MiB file limit with room for multipart overhead and bounded request reading. The Node route is capped at 60s; PDF parsing at 20s; provider call at 45s. Original uploads are persisted in PostgreSQL rather than a paid mounted disk. This is a deliberate small-demo trade-off, not a recommendation for large document storage.

Neon's current pricing page lists a $0 plan without a credit card, with a 1 GB database allowance per project. Configure our original-storage cap at 50 MiB to leave room for text, operations and database overhead. Free compute/connection limits and cold starts still apply; measure the actual deployed workflow before promising latency. Local development is entirely self-contained through PGlite, independent of cloud access.

Official evidence: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel limits](https://vercel.com/docs/functions/limitations), [Neon pricing](https://neon.com/pricing), [PGlite](https://pglite.dev/docs/).

## Privacy and remaining actions

Groq's policy distinguishes usage metadata, application state and limited reliability/abuse logs, and provides account data controls including ZDR. Do not infer that a free key guarantees zero retention or EU-only processing. The UI explains that selected source text/questions leave the app; demo fixtures are synthetic and CC0. Review [Groq data handling](https://console.groq.com/docs/your-data) before uploading private material. Gemini's pricing page explicitly differentiates free/paid content use; this was another reason to prefer Groq for this demo.

Update 2026-10-24: Ayham supplied the Groq key and existing Neon project. CLI authentication, Postgres-only deployment, direct migration and a production-server smoke test against Neon/Groq succeeded. The Neon account API reports `free`; project region is Frankfurt. The six-case real evaluation produced five validated, semantically reviewed responses and one safe evidence-validation rejection. No billing upgrade or paid fallback was used. GitHub and Vercel publication then succeeded, including public real-provider PDF and browser checks. Loom recording remains pending; its free five-minute limit is reflected in the 4:30 script. See [verification evidence](testing.md).
