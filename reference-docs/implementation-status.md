# Stage 2 implementation status

Updated: 2026-08-25

## Approved

The user approved the discovery baseline and Stage 2 implementation plan on 2026-08-25. The approval is recorded in `docs/README.md`.

## Completed in the first implementation slice

- Created a separate `site/` application surface while preserving the source archive and discovery package.
- Implemented the first responsive Persian RTL public launch experience.
- Applied approved positioning, service boundary, human-review message and privacy ownership language.
- Added site metadata and a branded social-preview image.
- Configured a reachable local preview on port 4173.
- Completed a production build successfully.
- Upgraded and overridden vulnerable production dependencies; `npm audit --omit=dev` reports zero known production vulnerabilities at this checkpoint.
- Added the first server-backed staging workflow: authenticated onboarding, durable member profile, versioned staging consent evidence, audit events, and a gated member dashboard.
- Added D1/R2 logical bindings and a reviewed baseline migration. The Drizzle generator failed in the sandbox with an operating-system memory lookup error, so the migration was written from the declared schema and retained for independent review.
- Verified the onboarding API end to end with a synthetic identity: valid profile submission, persistence, retrieval, audit creation, and authenticated dashboard access all returned successful responses.
- Final validation at this checkpoint: production build passed, lint passed, and the production dependency audit reported zero known vulnerabilities.
- Implemented approved clinical-package version `2026.1.0` as a guarded adult baseline assessment with four sections: immediate safety, pregnancy context, known history and lifestyle.
- Added durable versioned responses, normalized answers, pending clinical-review records, care tasks and audit events. No health score, diagnosis or recommendation is generated automatically.
- Verified both synthetic pathways: a non-urgent submission entered human review with an open task; a red-flag submission entered urgent escalation, created an urgent task and returned a clear instruction not to wait for an online result.
- Added a local-only clinician workspace with urgency-sorted review queue, full answer review, mandatory rationale, review decisions and audit logging.
- Verified human transitions with synthetic records: the normal case became `clinically_reviewed` and produced health-picture draft version 1; the urgent case became `urgent_acknowledged` while its operational follow-up task remained open.
- Production clinician access is default-deny and requires an explicit `CLINICAL_REVIEWER_IDS` allowlist. Development access is intentionally broader and prominently labeled test-only.
- Added the clinician-controlled publication workflow for health-picture drafts. Publication requires a manually authored summary and one to six explicit roadmap actions; no clinical content is generated autonomously.
- Added durable, versioned 12-month roadmaps and action records. Published health pictures are immutable through the publishing endpoint, and a repeat publication attempt is rejected.
- Added the protected member roadmap view and dashboard publication status.
- Verified the complete flow with synthetic data: draft detail returned successfully, clinician publication created roadmap version 1 with two actions, the member view displayed both the summary and action, and a duplicate publish returned HTTP 409.
- Integrated the member portal around one persistent journey: onboarding, assessment, human review, publication, roadmap progress, documents, appointments, assistance and reminder preferences now share the same member and audit records.
- Added member-recorded roadmap completion with evidence history and ownership checks.
- Added private R2 document upload with type/size validation, SHA-256 checksum, quarantine status, clinician review, approved-only member download and cross-member access denial. The local review step is explicitly not represented as production malware scanning.
- Added a server-owned assistance catalog for 3/6/9/12-month plans, idempotent local-test payment attempts, orders and active test subscriptions. All test prices are zero and no external charge occurs.
- Added provider records and a local-test booking adapter. A booking is displayed as confirmed only after the adapter returns its explicit test confirmation; invalid past bookings are rejected.
- Added durable reminder preferences. SMS is recorded as a local test preference and is never delivered externally.
- Added a clinician document-quarantine queue and an integrated operations view with clinical queue, document, appointment, subscription, task and audit counts.
- End-to-end synthetic verification passed across all member pages and the clinician/operations surfaces. Negative tests returned 401 for unauthenticated writes, 404 for cross-member document retrieval and 422 for an invalid past appointment; payment replay returned the original order.
- Reviewed the supplied `hamyar-salamat-mvp-complete-final-v7.html` and narrated journey video as UX references and aligned the operational member journey to their 11-stage sequence: secure entry; consent/profile; assessment package; service booking; results; clinical review; health picture; 12-month roadmap; execution choice; assistance payment; health home.
- Added a persistent 11-stage journey rail and state-derived next-step guidance across the authenticated member portal.
- Added a zero-value, server-owned test checkup order and explicit goal, insurance-status and minimal booking-consent capture before provider selection.
- Reordered the normal clinical workflow so the baseline intake is saved first and human clinical review is created only after an approved result is explicitly submitted. Urgent red-flag submissions still create immediate urgent review and follow-up tasks.
- Split the published health picture from the roadmap into distinct member stages, added self-managed versus active-assistance selection, and added a consolidated member record and final health-home surface.
- Verified the reference-aligned journey end to end with a new synthetic identity: `intake_complete → paid_test checkup → confirmed_test appointment → quarantined result → approved result → pending human review → health-picture draft → published picture/roadmap → active execution mode → active_test subscription`.

## Intentionally not implemented

Full longitudinal clinical records, production malware scanning, OTP, production staff identity integration, live payment, SMS delivery, CRM, Doctoreto/provider integration, automated clinical rules and production deployment remain gated. The present payment, booking and communication adapters are deliberately local-only test implementations. Activating external services before the remaining vendor, hosting and production-governance decisions would violate the approved discovery controls.

## Current gates

- The Stage 2 staging clinical package was approved by Dr. Najmeh Shirafkan, as attested by Bijan Khiabani on 2026-08-25. Per-version production rule approval remains required.
- Bijan Khiabani approved the current legal staging baseline on 2026-08-25. Final production legal documents, contracts and qualified-counsel validation where required remain pending.
- Confirm production hosting jurisdiction/provider and data-processing terms.
- Confirm payment, SMS, CRM and booking-provider contracts/APIs.
- Approve final pilot population, clinical workflow, consent/legal text, pricing and refund/subscription policy.
