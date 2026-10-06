# Integration plan

All suppliers are accessed through internal adapters. Production activation requires contract, security review, test credentials, documented error behavior and an operational owner.

## Integration register

| System | Purpose and minimum data | Proposed approach | Status / gate |
|---|---|---|---|
| ZarinPal | Hamyar invoice ID, amount, callback reference and status; no card data | Redirect checkout, signed/verified callback, idempotency, reconciliation | **Provisional**; **Requires vendor confirmation**, business and legal approval |
| Kavenegar | Phone number, approved template ID, minimal variables, delivery status | OTP and transactional SMS adapter; rate limits, opt-out where applicable | **Provisional**; **Requires vendor confirmation** and legal approval |
| Doctoreto | Minimum booking identity/contact, service, city/time, consent and partner reference | Catalog/availability/booking/status adapter plus signed webhooks or polling | **Provisional**; production API/contract **Requires vendor confirmation** |
| Partner centers | Order reference, service, booking and result provenance | Pilot OpenAPI, secure upload or center API; checksum and quarantine | Pilot specification exists; each center **Requires vendor confirmation** |
| Didar CRM | Lead/contact reference, non-clinical task, due date, outcome and internal link | Allowlisted outbound sync; inbound status events; no clinical fields | **Provisional**; **Requires vendor confirmation** and field-level privacy review |
| Liara | Runtime, PostgreSQL, private object storage and supporting services | Separate environments, private networking where available, encrypted backup/export | **Provisional**; jurisdiction/legal/security/vendor gates open |
| DNS/domain | Public domains and email/security records | Candidate `hamyarsalamat.ir` and `hamyarsalamat.com` | Availability, trademark and ownership **Require business/legal approval** |

## Canonical integration behavior

- Store external identifiers separately from internal IDs.
- Attach an idempotency key to every state-changing request.
- Authenticate callbacks, enforce timestamp/replay windows and record the raw-body hash, not unnecessary sensitive payloads.
- Retry only safe operations with exponential backoff; use circuit breakers and a dead-letter queue.
- Surface mismatches and exhausted retries as owned operations tasks.
- Never turn an uncertain vendor response into a successful payment, confirmed appointment or received result.
- Reconcile payments and bookings on a schedule independent of callbacks.
- Maintain a kill switch and a manual workflow for each critical adapter.

## Partner-center pilot API assessment

The supplied OpenAPI 3.0.3 contract (v1.0.0-pilot) defines center listing, services/prices, availability, order creation, booking create/read/delete and result webhooks. It proposes bearer JWT and `X-Hamyar-Signature`. Before use it needs explicit tenancy/scopes, key rotation, signature algorithm and canonicalization, replay protection, idempotency headers, pagination, error taxonomy, versioning/deprecation, rate limits, consent reference, data classification and webhook retry acknowledgement.

## Integration readiness checklist

For every supplier: legal entity and contract; data-processing terms; exact data fields; hosting/sub-processors; retention/deletion; API and sandbox access; authentication/key rotation; SLA/support/escalation; incident notification; rate limits; reconciliation; outage/manual fallback; exit/data export; staging contract tests; production runbook and named owner.

