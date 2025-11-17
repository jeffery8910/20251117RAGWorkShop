\# cloud-app/.env — for convenience when deploying to Vercel

\# IMPORTANT: Vercel does NOT read this file automatically in the cloud.

\# Copy these key/value pairs into Vercel Project → Settings → Environment Variables

\# (set for Production/Preview/Development as needed). Do NOT commit real secrets.



\# Admin

ADMIN\_TOKEN=REPLACE\_ME\_STRONG\_TOKEN



\# Google AI Studio (Gemini)

GEMINI\_API\_KEY=REPLACE\_ME

EMBED\_MODEL=gemini-embedding-001

GEN\_MODEL=gemini-2.5-flash



\# LINE Messaging API

LINE\_CHANNEL\_SECRET=REPLACE\_ME

LINE\_CHANNEL\_ACCESS\_TOKEN=REPLACE\_ME



\# Vector store (default: Qdrant)

VECTOR\_BACKEND=qdrant

QDRANT\_URL=https://REPLACE\_ME.cloud.qdrant.io

QDRANT\_API\_KEY=REPLACE\_ME

QDRANT\_COLLECTION=workshop\_rag\_docs



\# Conversations storage (default atlas; or pg/mysql/supabase)

LOG\_PROVIDER=atlas

\# Atlas Data API (fill only if LOG\_PROVIDER=atlas)

ATLAS\_DATA\_API\_BASE=https://data.mongodb-api.com/app/APP\_ID/endpoint/data/v1/action

ATLAS\_DATA\_API\_KEY=REPLACE\_ME

ATLAS\_DATA\_SOURCE=Cluster0

ATLAS\_DATABASE=ragdb

ATLAS\_COLLECTION=docs

ATLAS\_SEARCH\_INDEX=vector\_index



\# Optional: Gemini free-tier soft limits (only Gemini side is used)

\# Generation (2.5 Flash)

GEMINI\_GEN\_RPM=10

GEMINI\_GEN\_MAX\_CONCURRENCY=1

\# Embedding

GEMINI\_EMBED\_RPM=100

GEMINI\_EMBED\_MAX\_CONCURRENCY=1

GLOBAL\_RETRY\_MAX=4

GLOBAL\_RETRY\_BASE\_MS=500

GLOBAL\_RETRY\_MAX\_DELAY\_MS=5000



