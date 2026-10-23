# Research record

Official documentation consulted on **2026-10-23**. These support the proposed architecture; deployment compatibility remains to be tested with pinned dependencies. Google's product was researched through its documentation, not a live signed-in UI session.

| Source | Architectural use |
| --- | --- |
| [Google notebook creation guide](https://support.google.com/gemininotebook/answer/16206563?hl=en) | Notebook organization and Sources/Chat/Studio reference pattern; retain the employer's NotebookLM name |
| [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting) | Full-stack Node hosting option and server-side operation |
| [Railway volumes](https://docs.railway.com/reference/volumes) | Persistent private volume; replication and deployment downtime constraints |
| [Railway PostgreSQL](https://docs.railway.com/databases/postgresql) | Separate database service and private connection setup |
| [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) | Composite foreign keys, uniqueness and checks |
| [PDF.js getting started](https://mozilla.github.io/pdf.js/getting_started/) | `pdfjs-dist` package and display-layer API |
| [PDF.js Node text example](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs) | Node-side page iteration and text extraction feasibility |
| [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | Structured response contract; application checks remain necessary |

Before implementation, verify the configured model's context/output limits, tokenizer, structured-output support, timeout behavior, account retention and current rates. Pin a compatible Node/Next.js/PDF.js combination and prove extraction inside the actual deployment image. No provider price, exact model, service region or free-tier allowance is assumed here.
