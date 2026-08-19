## Detailed Technical & Functional Review Razorpay Wallet Integration OMNI BANK eKYC

Developer review of the proposed wallet, Razorpay payment, free-credit, KYC verification, refund and webhook

architecture

| Review purpose | Identify implementation risks and provide practical solutions before |
| --- | --- |
|   | development/go-live. |
| Review style | Human-readable developer handoff; no source citations in this version. |
| Primary focus | Financial correctness, duplicate protection, failure handling, security, database design |
|   | and testing. |
| Overall conclusion | Do not take the current design directly to production. Resolve the critical items |
|   | first. |

This document is based on the supplied 17-page Razorpay Payment Gateway Integration Plan for the eKYC wallet system. The intent is not to replace the original plan, but to turn the identified gaps into clear development actions, examples and acceptance criteria.


## 1. Executive Summary

The proposed architecture is a reasonable foundation: users receive free KYC credits, then add money to a wallet through Razorpay and use the wallet for paid KYC services. The document also includes wallet transactions, low-balance alerts, payment verification, Razorpay webhooks and automatic refund concepts.

The main problem is not the overall idea. The problem is that the financial state transitions are not specified deeply enough. In a payment system, small ambiguities can result in duplicate credits, incorrect balances, lost free credits or money being refunded incorrectly.

## The highest-priority items are:

- Prevent the same Razorpay payment from crediting the wallet more than once.

- Make wallet debit/credit operations safe when multiple requests happen at the same time.

- Define exactly how payment verification and Razorpay webhooks work together.

- Handle Decentro timeouts differently from confirmed failures.

- Define what happens when a Razorpay refund occurs after wallet money has already been spent.

- Add idempotency and unique constraints to the financial records.

- Add reconciliation so Razorpay, the application database and wallet ledger can be compared.

- Add proper audit records for financial and KYC state changes.

- Strengthen free-credit handling when a provider call fails.

- Expand testing to include duplicate events, retries, timeouts and concurrent requests.

## 2. Issue Summary by Priority

| ID Issue Priority Status PAY-01 Wallet may be credited twice CRITICAL Must fix PAY-02 No clear idempotency strategy CRITICAL Must fix WAL-01 Concurrent wallet deductions CRITICAL Must fix REF-01 Refund behavior is incomplete CRITICAL Must fix KYC-01 Free credit can be lost on failure HIGH Fix before release KYC-02 Timeout/unknown provider result HIGH Fix before release WEB-01 Webhook processing rules incomplete HIGH Fix before release DB-01 Ledger/payment traceability incomplete HIGH Fix before release SEC-01 API authorization not fully defined HIGH Fix before release |
| --- |
| AUD-01 Audit trail not defined HIGH Fix before release REC-01 No reconciliation process HIGH Fix before production PRI-01 Pricing and historical charge handling MEDIUM Clarify TST-01 Testing plan is too narrow HIGH Expand |

## 3. Razorpay Payment and Wallet Credit Issues

## PAY-01 — Possible double wallet credit [CRITICAL]

## Problem

The plan contains both a payment verification endpoint and a Razorpay payment.captured webhook that can update the


wallet. If both paths are implemented as independent wallet-credit operations, one successful payment can be credited twice.

## Why it matters

Customer pays ■1,000. The browser calls the verification API and the wallet becomes ■1,000 higher. Shortly afterwards the captured webhook is processed and the wallet becomes another ■1,000 higher.

## Recommended solution

Choose one controlled wallet-crediting workflow. A practical design is to use the payment verification endpoint to validate the payment and use the webhook as the durable server-side confirmation, with an internal payment record controlling whether the wallet has already been credited. The important point is that the wallet credit operation must be idempotent.

## Implementation notes

Create a payment/top-up record before crediting the wallet. Track order ID, payment ID, expected amount, received amount, payment status and whether the wallet credit has been completed. Never add money merely because an endpoint was called successfully.

## Acceptance criteria

The same payment can be submitted through the verification API ten times and delivered through the webhook multiple times, but the wallet must increase only once.

## PAY-02 — Missing idempotency strategy [CRITICAL]

## Problem

The transaction design has a generic reference_id, but the plan does not clearly define uniqueness or duplicate-event protection.

## Why it matters

Payment providers retry requests. Browsers retry requests. Network failures cause clients to repeat requests. Without idempotency, a retry can become a second financial transaction.

## Recommended solution

Use unique identifiers and idempotent service methods. The exact unique keys should be defined in the schema, but Razorpay payment ID and webhook event ID are strong candidates for duplicate protection.

## Implementation notes

Before creating a financial transaction, check whether the same provider reference has already been processed. Prefer a database UNIQUE constraint as the final safety net rather than relying only on application code.

## Acceptance criteria

Repeated processing of the same payment/event returns the existing result or a harmless duplicate response. No additional balance change occurs.

## PAY-03 — Payment amount must be server-controlled [HIGH]

## Problem

The top-up API accepts an amount from the client. The server must not trust a browser-provided amount when creating a payment or crediting a wallet.

## Why it matters

A malicious or buggy client could submit ■100 while attempting to manipulate the backend into crediting ■1,000, or could submit an unexpected decimal value.

## Recommended solution

Validate the amount on the backend. Apply minimum/maximum limits, currency checks and integer money handling. When a Razorpay payment is received, compare the actual captured amount against the stored order amount before crediting the wallet.

## Implementation notes

Store the intended order amount before checkout. On successful payment, verify order ID, payment ID, currency and amount before final wallet credit.

## Acceptance criteria

Any amount mismatch places the payment into an exception/review state and does not silently credit the wallet.


## PAY-04 — Payment status can be different from browser status [HIGH]

## Problem

The browser can lose connection after payment, close unexpectedly or report a failure even though Razorpay later captures the payment.

## Why it matters

Customer pays successfully but the browser times out. The customer sees 'Payment failed' and tries again. The first payment is later captured, creating a potential duplicate top-up or customer-support issue.

## Recommended solution

Treat the backend/payment provider state as authoritative. The frontend should display the current wallet/payment state after the backend confirms it.

## Implementation notes

Keep payment records in states such as CREATED, PAYMENT_RECEIVED, VERIFIED, CAPTURED, CREDITED, FAILED, REFUNDED or REVIEW_REQUIRED as appropriate for the chosen implementation.

## Acceptance criteria

A lost browser session cannot cause a captured payment to disappear. The payment remains traceable and is eventually reflected correctly in the wallet.

## 4. Razorpay Webhook Design

## WEB-01 — Webhook signature verification needs a complete implementation rule [HIGH]

## Problem

The plan includes HMAC-SHA256 signature verification, which is correct at a high level, but it does not describe raw-body handling, duplicate events, event persistence or safe retry behavior.

## Why it matters

If the JSON body is parsed and then re-serialized before signature verification, the exact bytes may differ and a valid webhook can fail verification.

## Recommended solution

Verify the webhook against the original request body. Validate the signature before business processing. Store a unique event identifier and process each event only once.

## Implementation notes

Reject invalid signatures. Record accepted events. Detect duplicate events before applying financial changes. Keep the webhook handler fast and move heavier work to a controlled processing path if required.

## Acceptance criteria

An invalid webhook cannot change wallet balances. A repeated valid webhook cannot change the same balance twice.

## WEB-02 — Webhook event ordering needs to be handled [HIGH]

## Problem

The plan lists payment captured, failed and refunded events, but does not explain what happens if events arrive late, are repeated or arrive in an unexpected order.

## Why it matters

A refund-related event may arrive after another status update, or a duplicate event may arrive after the original transaction has already been closed.

## Recommended solution

Use the stored payment state and event history to decide whether an incoming event is new, stale, duplicate or contradictory. Do not blindly apply every event as a balance-changing command.

## Implementation notes

Every webhook should first identify the internal payment record. Apply only valid state transitions. Keep an event history for troubleshooting.

## Acceptance criteria

Out-of-order or duplicate events cannot corrupt the payment or wallet state.


## WEB-03 — Webhook should not be the only source of financial reconciliation [HIGH]

## Problem

Webhooks are important but network failures, configuration mistakes and processing errors can happen.

## Why it matters

A webhook is delivered while the application is temporarily unavailable, or the webhook handler fails after the provider has marked the payment captured.

## Recommended solution

Add a reconciliation process that can compare provider-side payment records with internal payment and wallet records.

## Implementation notes

Build an admin report/job for unmatched payments and define who investigates and how corrections are recorded.

## Acceptance criteria

A missing webhook is detectable and does not permanently leave a customer's money unaccounted for.

## 5. Wallet and Ledger Issues

## WAL-01 — Concurrent wallet deductions can overspend the balance [CRITICAL]

## Problem

The flow checks whether the balance is sufficient before calling the KYC provider, but it does not define an atomic reservation/deduction.

## Why it matters

Wallet has ■10. Two requests costing arrive together. Both read ■10 before either updates the database. Both may continue, causing an incorrect balance.

## Recommended solution

Use an atomic database operation or transaction that reserves/deducts the amount only if the available balance is still sufficient.

## Implementation notes

Do not perform 'SELECT balance' followed later by an unrelated UPDATE. Use a transaction/locking strategy or conditional update. The exact method depends on the database layer already used by the project.

## Acceptance criteria

Two simultaneous requests against a ■10 balance result in only one successful paid reservation.

## WAL-02 — Balance and transaction ledger can drift apart [HIGH]

## Problem

The design stores both a wallet balance and wallet transactions. If one is updated and the other fails, they can disagree.

## Why it matters

Wallet says ■1,000 but the transaction history totals ■800 because a transaction insert failed after the balance update.

## Recommended solution

Update the balance and ledger entry inside the same database transaction whenever possible. If an external event is involved, use durable intermediate states.

## Implementation notes

Every balance-changing operation should create a corresponding ledger transaction. Reconciliation should be able to identify discrepancies.

## Acceptance criteria

A successful wallet change always has a matching transaction record and can be reconstructed from the audit/ledger history.

## WAL-03 — Wallet transaction model needs more context [HIGH]

## Problem

The generic transaction fields are useful, but they are not enough to fully explain a KYC charge or payment lifecycle.


## Why it matters

Support asks why was deducted. The system should be able to show which user, KYC request, provider request and price caused that debit.

## Recommended solution

Add or link fields for user, KYC application, service type, provider, provider reference, amount, status, reason and timestamps.

## Implementation notes

The support/admin team can trace a wallet transaction from customer wallet KYC request provider request final result.

## Acceptance criteria

Any wallet transaction can be explained without reading application logs manually.

## WAL-04 — Negative balance policy is not defined [HIGH]

## Problem

Refunding a payment by simply subtracting the refunded amount can create a negative wallet balance if the user already spent the funds.

## Why it matters

Customer adds ■1,000, spends ■900, then the original ■1,000 payment is refunded. The wallet has only ■100 remaining.

## Recommended solution

Define a business rule for this case. Options include blocking the refund until recovery, recording a customer debt/negative balance, or using another approved recovery process. The correct choice is a business/legal decision and should not be invented by the developer.

## Implementation notes

Document the selected rule and implement it as an explicit state rather than allowing accidental negative balances.

## Acceptance criteria

Refund processing follows a known policy in every balance condition.

## 6. KYC and Free-Credit Issues

## KYC-01 — Free credit can be lost if the provider fails [HIGH]

## Problem

The flow uses the free credit before calling the KYC provider, but the plan does not clearly show a restoration path for a failed free-credit verification.

## Why it matters

User has 1 free PAN credit. The PAN provider times out. The user did not receive a result but the credit is already gone.

## Recommended solution

Treat the free credit as reserved during processing. Consume it only when the verification succeeds, or restore it when the failure is confirmed.

## Implementation notes

Create a clear credit lifecycle: AVAILABLE RESERVED CONSUMED or RESTORED.

## Acceptance criteria

A failed verification does not permanently reduce the customer's free-credit entitlement unless the business intentionally defines that behavior.

## KYC-02 — Provider timeout must not be treated as a confirmed failure [HIGH]

## Problem

The plan focuses on API success/failure, but external APIs can also return no answer.

## Why it matters

The application sends a PAN verification request. The provider processes it successfully but the network times out before the response reaches Omni Bank.


## Recommended solution

Use a provider request/reference ID and support a PENDING or UNKNOWN state. Retry only when the provider supports safe idempotency or status lookup.

## Implementation notes

Define timeout thresholds, retry rules, provider status lookup, and reconciliation behavior.

## Acceptance criteria

A timeout cannot accidentally cause a duplicate provider request or an incorrect wallet refund.

## KYC-03 — Duplicate KYC requests need protection [HIGH]

## Problem

A user may click the Verify button twice, refresh the page, or retry after a network error.

## Why it matters

One click creates a Decentro request. The response is delayed, so the frontend retries. Two provider calls may be created and two charges may occur.

## Recommended solution

Create an internal KYC transaction before calling the provider and give it an idempotency/reference key. Reject or reuse a request already in progress.

## Implementation notes

The backend must identify duplicate requests for the same intended operation.

## Acceptance criteria

Repeated submission of the same KYC action does not create duplicate paid verification charges.

## KYC-04 — Free-credit abuse is not addressed [MEDIUM]

## Problem

The plan gives each new user a fixed set of free credits with no expiry. The document does not define anti-abuse controls.

## Why it matters

A person creates multiple accounts and receives the free allocation repeatedly.

## Recommended solution

The exact policy is a business decision. Consider stronger account verification, organization-level limits or other approved anti-abuse controls.

## Implementation notes

Document the eligibility rule and enforce it consistently. Do not silently introduce identity checks without business approval.

## Acceptance criteria

The free-trial policy is explicit and abuse controls are measurable.

## 7. Refund and Failure Handling

## REF-01 — Auto-refund needs state management [CRITICAL]

## Problem

The plan describes deduction, provider call and refund, but does not define the transaction states in enough detail.

## Why it matters

If the server crashes after deducting the wallet but before recording the provider result, the next retry must know whether the original operation is still running or should be reconciled.

## Recommended solution

Use explicit states such as RESERVED/PENDING, COMPLETED, FAILED, REFUND_PENDING and REFUNDED. The exact names can vary, but the state machine must be defined.

## Implementation notes

Every transition should be durable. A restart should not lose the state of a financial transaction.


## Acceptance criteria

The system can recover safely after a server crash at any point in the KYC/payment workflow.

## REF-02 — Refunds must be idempotent [HIGH]

## Problem

A refund process can itself be retried. Without protection, the same failed KYC operation could return money to the wallet more than once.

## Why it matters

A refund is a financial transaction. A timeout after creating a refund can cause the application to retry and accidentally create a second refund.

## Recommended solution

Give every refund a unique internal reference tied to the original deduction. If a refund already exists, return or reuse the existing refund instead of creating another wallet adjustment.

## Implementation notes

Keep the original debit transaction linked to its refund transaction. Store refund status and provider references where applicable.

## Acceptance criteria

Repeating the same refund request or receiving the same refund event cannot increase the wallet more than the original amount owed.

## 8. Security and Access Control

## SEC-01 — Never trust client user IDs

Issue: Wallet APIs must not rely on a user ID supplied by the browser to decide whose wallet is being accessed.

Solution: Derive the user identity from the authenticated session/JWT and authorize the operation against that identity.

## SEC-02 — Keep Razorpay secrets server-side

Issue: Key secrets and webhook secrets are sensitive credentials.

Solution: Only the backend should access them. The frontend may receive the public Key ID where required for checkout, but never the secret.

## SEC-03 — Validate all financial inputs

Issue: Amount, currency, payment IDs and references must be validated before any wallet change.

Solution: Validate type, range, currency, ownership and relationship between order/payment records.

## SEC-04 — Log security failures

Issue: Invalid webhook signatures, suspicious payment mismatches and unauthorized wallet access should not disappear into generic application logs.

Solution: Create structured security/audit events with enough information for investigation without storing secrets or unnecessary sensitive data.

## 9. Audit and Operational Visibility

For a financial eKYC system, developers and support staff need to answer basic questions quickly: Who changed the wallet? Why did it change? Which payment caused it? Which KYC request caused the deduction? What happened when the provider failed?

## At minimum, audit events should cover:

- Wallet created.

- Razorpay order created.


- Payment verified.

- Payment captured.

- Wallet credited.

- Wallet debited.

- Free credit reserved/consumed/restored.

- KYC provider request started/completed/failed.

- Refund initiated/completed.

- Webhook accepted/rejected/duplicated.

- Manual/admin wallet adjustment.

- Reconciliation mismatch detected and resolved.

## 10. Pricing and Business Rules

The current document defines selling prices for PAN verification but leaves Credit Score and Aadhaar pricing to be finalized. That is acceptable at planning stage, but production code should not depend on unfinished pricing decisions.

The pricing table also calls the difference between cost and selling price a 'Margin'. The percentages shown are actually markup percentages based on provider cost. For management reporting, it is better to show gross profit, markup percentage and gross margin percentage separately.

## The business team should finalize:

- Selling price for each service.

- Minimum and maximum wallet top-up.

- Low-balance threshold.

- Whether auto-recharge is supported.

- Refund-to-wallet versus refund-to-source policy.

- Treatment of unused wallet funds.

- Treatment of wallet balance after account closure.

- Pricing behavior for retries and pending requests.

## 11. Reconciliation and Recovery

A payment system should assume that something will eventually go wrong: a webhook can fail, a server can restart, a provider can time out, or a database transaction can be interrupted.

## Recommended reconciliation checks:

- Razorpay captured payment with no internal payment record.

- Internal payment marked captured but no wallet credit exists.

- Wallet credit exists but no valid payment exists.

- Duplicate wallet credit for the same payment.

- Refund recorded by Razorpay but not reflected internally.

- Internal refund recorded but provider refund is missing.

- Wallet balance does not match the expected ledger.

- KYC marked successful but corresponding wallet deduction is missing.

- KYC marked failed but wallet deduction has not been restored.


The reconciliation process should not silently modify money. It should identify the mismatch, record it and follow an approved correction process. Automatic corrections should only be used where the rule is deterministic and safe.

## 12. Suggested Logical Data Model

The original plan has wallet, wallet_transaction and free_credits tables. A cleaner financial design can separate the payment provider lifecycle from the wallet ledger while keeping the implementation manageable.

```
User
Wallet
WalletTransaction
Payment / TopUp
Razorpay Order ID
Razorpay Payment ID
Expected Amount
Captured Amount
Payment Status
Wallet Credit Status
KYC Transaction
User ID
Service Type
Amount
Wallet Transaction ID
Provider Request ID
Provider Status
Final Result
```

The exact schema should follow the existing application's database technology and Prisma model conventions. The important requirement is traceability and safe state transitions, not a specific table naming scheme.

## 13. API-Level Recommendations

| API | Important backend rules |
| --- | --- |
| POST /wallet/topup | Authenticate user; validate amount; create order server-side; store order |
|   | record. |
| POST /wallet/topup/verify | Verify payment; validate order/payment/amount; do not double-credit wallet. |
| GET /wallet/balance | Return authenticated user's wallet only. |
| GET /wallet/transactions | Return authenticated user's transactions; support pagination. |
| POST /credits/use | Do not trust client credit count; perform atomic reservation/consumption. |
| POST /kyc/verify/* | Create idempotent KYC transaction; reserve wallet/credit safely; handle |
|   | provider timeout. |
| POST /webhooks/razorpay | Verify raw-body signature; deduplicate; validate event; process safely. |

## 14. Detailed Testing Plan

## Payment success

- Create order successful payment verification captured webhook one wallet credit.

- Repeat verification request no second wallet credit.

- Repeat webhook no second wallet credit.

## Payment failure


- Payment fails no wallet credit.

- Failed payment webhook is processed repeatedly no wallet change.

- Payment verification receives an invalid signature reject.

## Amount mismatch

- Expected ■1,000 but received amount differs do not credit automatically.

- Wrong currency do not credit.

## Wallet concurrency

- Two simultaneous deductions with insufficient combined balance only valid requests succeed.

- Multiple simultaneous top-ups each valid payment credits exactly once.

## KYC provider

- Successful response correct charge and result.

- Confirmed failure correct refund/restoration.

- Timeout pending/reconciliation path.

- Retry after timeout no duplicate provider charge if the provider supports idempotency/status lookup.

## Free credits

- Successful verification consumes one credit.

- Confirmed failure restores/reserves correctly.

- Two simultaneous requests cannot consume the same final free credit.

## Refund

- Refund is processed once.

- Repeated refund event does not create another wallet adjustment.

- Refund after spending follows the approved negative-balance/recovery policy.

## Security

- User A cannot read User B's wallet.

- User A cannot manipulate a wallet transaction by changing user IDs.

- Secrets are never returned to the frontend or exposed in logs.

- Fake/invalid webhooks cannot alter financial state.


## 15. Developer Implementation Checklist

- 1. Confirm the final payment state machine.

- 2. Confirm the single authoritative wallet-credit workflow.

- 3. Add database uniqueness/idempotency protection.

- 4. Add atomic wallet debit/credit operations.

- 5. Create a payment/top-up record with provider references.

- 6. Define webhook raw-body signature verification.

- 7. Store and deduplicate webhook event IDs.

- 8. Define webhook state-transition rules.

- 9. Implement free-credit reservation and restoration.

- 10. Implement KYC idempotency.

- 11. Handle provider timeout/unknown states.

- 12. Define and implement refund states.

- 13. Define the refund-after-spending policy.

- 14. Add audit events.

- 15. Add reconciliation/reporting.

- 16. Secure every wallet and credit endpoint.

- 17. Validate all payment amounts and currencies server-side.

- 18. Store actual charged amount on every transaction.

- 19. Add monitoring and alerts for financial mismatches.

- 20. Complete negative/concurrency/retry testing.

- 21. Run test-mode end-to-end payment scenarios.

- 22. Obtain business/legal approval for refund and wallet policies.

- 23. Only then enable live payments.

## 16. Recommended Acceptance Criteria

| Area | Acceptance criteria |
| --- | --- |
| Wallet credit | One successful Razorpay payment can increase the wallet exactly once, regardless of |
|   | repeated API calls or webhooks. |
| Wallet debit | A wallet cannot be overspent by concurrent KYC requests. |
| Free credit | A failed KYC attempt does not permanently consume a free credit unless that behavior is |
|   | explicitly approved. |
| Provider timeout | A timeout creates a safe pending/unknown state and does not automatically cause an |
|   | unsafe refund or duplicate provider call. |
| Refund | A refund can be retried safely and can never credit/debit the wallet more than intended. |
| Security | A user can access only their own wallet and transaction data. |
| Audit | Every financial balance change can be traced to a payment, KYC request or approved |
|   | adjustment. |


| Area | Acceptance criteria |
| --- | --- |
| Reconciliation | The system can identify mismatches between provider payments, internal payments and |
|   | wallet transactions. |
| Recovery | A server restart or process crash does not leave an unrecoverable financial state. |
| Testing | All critical negative and concurrency scenarios pass before production. |

## 17. Final Recommendation

Recommendation: revise the design before the payment/wallet portion is implemented for production.

The current plan is useful as a functional starting point, but it needs a more explicit financial state machine. The developer should not fill these gaps with assumptions because the consequences are directly related to customer money, KYC usage and transaction history.

## A practical high-level payment sequence is:

```
Payment created
Payment received / verified
Provider/webhook confirmation
Idempotency check
Atomic wallet credit
Ledger + audit record
Reconciliation
```

For KYC, the same principle applies: reserve the customer's money or free credit safely, call the provider with a traceable reference, handle success/failure/timeout as different states, and make every retry safe.

Production gate: do not enable live payments until the critical duplicate-credit, idempotency, concurrency, refund and webhook controls are implemented and tested.

Prepared as a detailed developer handoff from the supplied eKYC Razorpay integration plan. No inline source citations are included in this version.
