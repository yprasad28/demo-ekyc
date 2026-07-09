# Debug Log

## Bug 1: customer-login returns 500 immediately

- **Root cause:** `ENCRYPTION_KEY` in `.env` was 33 bytes (`securekyc-32-byte-demo-key-123456`) but `encryption.ts:7` requires exactly 32 bytes. `getKey()` threw, Prisma write failed, fell back to mockDb.
- **Why it happened:** The key string was miscounted — 33 characters, not 32. The trailing `6` was extra.
- **Category:** Configuration / Environment variable mismatch
- **Fix applied:** Changed `.env` to `ENCRYPTION_KEY="securekyc-32-byte-demo-key-12345"` (32 bytes)

---

## Bug 2: mobileHash column missing in Supabase

- **Root cause:** The `mobileHash` column was never added to the Supabase `customers` table. Prisma schema had `mobileHash String @unique` but the DB table didn't have the column, causing silent failures.
- **Why it happened:** Schema was updated but DB migration wasn't run via SQL.
- **Category:** Database schema drift
- **Fix applied:** `ALTER TABLE customers ADD COLUMN "mobileHash" TEXT; CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_mobilehash ON customers("mobileHash");`

---

## Bug 3: Prisma generated client missing mobileHash

- **Root cause:** `src/generated/` Prisma client was committed to git before `mobileHash` was added to schema. Prisma silently ignored the field on insert.
- **Why it happened:** Generated files were committed before schema update. `prisma generate` wasn't re-run before commit.
- **Category:** Build artifact staleness
- **Fix applied:** Ran `npx prisma generate` to regenerate client with mobileHash support

---

## Bug 4: mobileHash plaintext in Supabase (Vercel)

- **Root cause:** Vercel `ENCRYPTION_KEY` env var was set to 33 bytes (same miscount as Bug 1). On Vercel, `getKey()` threw on every encrypt() call, causing all writes to fall back to mockDb.
- **Why it happened:** Env var was set to the same wrong value as the original `.env`.
- **Category:** Environment variable mismatch (production)
- **Fix applied:** Updated Vercel `ENCRYPTION_KEY` to 32-byte value

---

## Bug 5: ESLint build failure — unused imports

- **Root cause:** `verifyAdminToken`, `MobileSchema` in `admin-login/route.ts` and `decrypt` in `mock-db.ts` were imported but unused.
- **Why it happened:** Security hardening added imports that weren't used in the final code.
- **Category:** ESLint strict mode / code hygiene
- **Fix applied:** Removed unused imports from both files

---

## Bug 6: TypeScript type error — decryptIfNotNull returns string|null

- **Root cause:** `decryptIfNotNull()` returns `string | null` but `CustomerMock.mobile` is typed as `string`. TypeScript strict mode caught the mismatch.
- **Why it happened:** `decryptIfNotNull` was added to decrypt on read, but the return type wasn't compatible with the existing interface.
- **Category:** TypeScript type mismatch
- **Fix applied:** Changed `decryptIfNotNull(x)` to `decryptIfNotNull(x) ?? x` in `mock-db.ts` findCustomerByMobile, findCustomerById, and listApplications

---

## Bug 7: Zod v4 z.record() API change

- **Root cause:** Zod v4 changed `z.record()` to require 2 args (key schema, value schema). Code used v3 syntax `z.record(z.unknown())`.
- **Why it happened:** Zod was upgraded to v4.4.3 but the schema code wasn't updated for the breaking API change.
- **Category:** Library API breaking change
- **Fix applied:** Changed `z.record(z.unknown())` to `z.record(z.string(), z.unknown())` in `validators.ts`
