# Architecture proposal

## Decision

Use a modular monolith for the operational MVP, with explicit domain boundaries and an event/outbox mechanism. This matches the supplied architecture and reduces early operational complexity while retaining a path to extract high-load modules later.

Status: **Provisional**, recommended for approval.

## Proposed system shape

- Member web/PWA, clinician portal, operations portal and admin portal consume server APIs only.
- TypeScript/Next.js supports the web experience. Server-side domain modules may live in the same monorepo with independently deployable web, API and worker processes.
- PostgreSQL is the transactional source of truth.
- Private, encrypted, versioned S3-compatible object storage holds medical documents.
- A durable queue and outbox handle reminders, partner calls, malware scanning and reconciliation.
- Redis is used only where justified for rate limits, short-lived state, locks and delayed jobs.
- External systems are isolated behind typed adapters and canonical internal models.
- Logs, metrics and traces use correlation IDs and exclude health data by default.
- Development, staging and production are isolated accounts/environments with separate secrets and data.

## Domain modules

Identity & Access; Consent; Member Profile; Clinical Record; Assessment & Checkup; Clinical Review; Health Picture; Roadmap; Catalog & Pricing; Orders & Payments; Subscription; Provider & Booking; Documents; Notifications; Care Operations; CRM Adapter; Sharing & Portability; Audit & Compliance; Reporting.

Each module owns its tables and exposes interfaces. Cross-module work uses transactions for immediate invariants and outbox events for asynchronous effects. No external payload becomes the internal domain model.

## Key state machines

- Checkup: `draft → ordered → booking_pending → result_pending → review_pending → roadmap_ready → delivered`.
- Subscription: `pending_payment → active → paused/completed/expired/cancelled`.
- Appointment: requested, pending-provider, confirmed, reschedule-required, completed, cancelled, failed.
- Document: initiated, uploaded, quarantined, rejected or clean, clinically-reviewed, published/superseded.
- Payment: created, redirected, callback-received, verified, paid/failed, refunded/partially-refunded.

Exact transition names may change during design, but transitions, actors, timestamps and reasons must remain auditable.

## Infrastructure proposal

**Provisional:** host production in Iran, with Liara as candidate for application runtime, managed PostgreSQL and private S3-compatible storage. Use a separate security-reviewed backup location in the legally approved jurisdiction. This is **Requires legal approval** and **Requires vendor confirmation** for encryption, key control, logs, backups, restore, deletion, sub-processors, incident notification and exit/export.

## Non-functional baseline

- Default-deny authorization and least privilege.
- Encryption in transit and at rest; secrets never committed.
- Idempotency for payments, bookings, webhooks and jobs.
- Horizontal scaling for stateless processes; database migrations are forward-safe and reviewed.
- Defined recovery objectives, automated backups and tested restore.
- Accessibility, RTL correctness and usable low-bandwidth behavior.
- Staging contract tests for every vendor adapter.
- SAST, dependency/secret scans, DAST and independent penetration testing before public launch.

## Architecture decisions deferred

Cloud/service contract, queue product, identity vendor vs in-house OTP, WAF/CDN, observability vendor, key-management design, backup region, RPO/RTO, analytics platform, and whether a separate NestJS API is warranted. These are implementation decisions after scope approval, not reasons to start coding now.

