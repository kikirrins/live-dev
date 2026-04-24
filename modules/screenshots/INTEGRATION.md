---
module_id: screenshots
role: shared
host_requirements:
  framework: "next or express"
dependencies: [host-proxy]
host_changes:
  - action: create
    path: app/lib/screenshot-store.ts
    source_snippet: null
    reason: "Implement ScreenshotStore against the host's own S3 bucket or database. Pick one recipe below."
  - action: modify
    path: app/api/livedev/issues/route.ts
    source_snippet: modules/host-proxy/next/route.ts
    reason: "Detect multipart body, call store.put(bytes, meta), append viewer link to issue body."
  - action: create
    path: app/api/livedev/screenshots/[id]/route.ts
    source_snippet: modules/host-proxy/next/screenshots/[id]/route.ts
    reason: "Viewer route: session auth + whitelist check, then store.get(id) → stream PNG."
env_vars:
  - { name: AWS_REGION, scope: host, required: "if using S3", example: "us-east-1", secret: false }
  - { name: LIVEDEV_S3_BUCKET, scope: host, required: "if using S3", example: "my-app-assets", secret: false }
  - { name: LIVEDEV_S3_PREFIX, scope: host, required: false, example: "livedev/screenshots", secret: false, default: "livedev/screenshots" }
  - { name: LIVEDEV_APP_ORIGIN, scope: host, required: true, example: "https://myapp.com", secret: false }
  - { name: LIVEDEV_SCREENSHOT_MAX_BYTES, scope: host, required: false, example: "10485760", secret: false, default: "10485760" }
credentials:
  - "S3 path: host's standard AWS credential mechanism (IAM role, env vars, ~/.aws/credentials). No livedev-specific credential."
  - "DB path: no additional credentials — use whatever the host already has for DB access."
routes:
  - { method: POST, path: /api/livedev/issues, multipart: true }
  - { method: GET, path: /api/livedev/screenshots/:id }
mount_points: []
verification_steps:
  - "Submit an issue via the overlay with a screenshot. POST /api/livedev/issues returns 201. GitHub issue body contains a [View screenshot](...) link."
  - "GET /api/livedev/screenshots/<id> as a whitelisted user → 200, Content-Type: image/png, Cache-Control: private, no-store."
  - "GET /api/livedev/screenshots/<id> as non-whitelisted → 403."
  - "GET /api/livedev/screenshots/not-a-real-uuid → 404."
  - "POST /api/livedev/issues with a body > LIVEDEV_SCREENSHOT_MAX_BYTES → 413."
  - "Cancel the share-tab dialog in the browser → issue still filed, no screenshot link in body."
---

# Screenshots — integration spec

**Pick one backend.** The `ScreenshotStore` interface is the same regardless of which you choose; only the implementation file differs.

---

## Interface

```ts
// from modules/screenshots/src/storage.ts — copy verbatim into your implementation file
import type { ScreenshotStore } from "@livedev/screenshots";
```

---

## Recipe 1 — S3 (primary)

Recommended env vars: `AWS_REGION`, `LIVEDEV_S3_BUCKET`, `LIVEDEV_S3_PREFIX` (default `livedev/screenshots`), plus the host's usual AWS credentials mechanism (IAM role preferred; env vars work).

```ts
// app/lib/screenshot-store.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { ScreenshotStore, ScreenshotBlob } from "@livedev/screenshots";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const bucket = process.env.LIVEDEV_S3_BUCKET!;
const prefix = process.env.LIVEDEV_S3_PREFIX ?? "livedev/screenshots";

export const store: ScreenshotStore = {
  async put(bytes, meta) {
    const id = crypto.randomUUID();
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${prefix}/${id}.png`,
      Body: bytes,
      ACL: "private",
      ContentType: "image/png",
      Metadata: { ownerId: meta.ownerId, createdAt: String(meta.createdAt) },
    }));
    return { id };
  },

  async get(id): Promise<ScreenshotBlob | null> {
    try {
      const res = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${id}.png`,
      }));
      const bytes = await res.Body!.transformToByteArray();
      return {
        bytes,
        contentType: "image/png",
        meta: {
          ownerId: res.Metadata?.ownerid ?? "",
          createdAt: Number(res.Metadata?.createdat ?? 0),
        },
      };
    } catch (err: any) {
      if (err?.name === "NoSuchKey") return null;
      throw err;
    }
  },
};
```

---

## Recipe 2 — DB fallback

Use the host's existing database. No livedev-specific env vars — the host already has a connection string / ORM configured.

Schema (SQL):

```sql
CREATE TABLE screenshots (
  id         TEXT        PRIMARY KEY,
  png        BYTEA       NOT NULL,   -- use BLOB for SQLite / MySQL
  owner_id   TEXT        NOT NULL,
  created_at BIGINT      NOT NULL    -- Unix epoch millis
);
```

```ts
// app/lib/screenshot-store.ts
// Replace `db` with the host's ORM / query builder.
import { db } from "@/lib/db";
import type { ScreenshotStore, ScreenshotBlob } from "@livedev/screenshots";

export const store: ScreenshotStore = {
  async put(bytes, meta) {
    const id = crypto.randomUUID();
    await db.query(
      "INSERT INTO screenshots (id, png, owner_id, created_at) VALUES ($1, $2, $3, $4)",
      [id, Buffer.from(bytes), meta.ownerId, meta.createdAt],
    );
    return { id };
  },

  async get(id): Promise<ScreenshotBlob | null> {
    const row = await db.queryOne<{ png: Buffer; owner_id: string; created_at: number }>(
      "SELECT png, owner_id, created_at FROM screenshots WHERE id = $1",
      [id],
    );
    if (!row) return null;
    return {
      bytes: new Uint8Array(row.png),
      contentType: "image/png",
      meta: { ownerId: row.owner_id, createdAt: row.created_at },
    };
  },
};
```

---

## Security invariants

These three invariants MUST be preserved by any implementation:

1. **Unguessable id.** `put` MUST generate a crypto-random UUID v4 (or longer). Sequential or predictable ids allow enumeration.
2. **`get` does not authorize.** The store is called only after the viewer route has already performed session auth and whitelist checks. Keeping auth out of the store means the same store works under any route policy the host wants to layer on top.
3. **Private backend.** S3 buckets MUST have no public ACL (`ACL: "private"`). DB rows MUST be reachable only from the host's own code paths. No public or pre-signed URLs are ever generated.

## Import conventions

Every reference file in this repo uses **extensionless** relative imports (`from "./foo"`, not `from "./foo.js"`). You can copy-paste into a Next.js / Vite / tsup host without rewriting. Workspace packages (`@livedev/*`) resolve via `exports` pointed at `.ts` sources — consumers bundle from source.
