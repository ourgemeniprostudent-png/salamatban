# Implementation plan after approval

This plan intentionally contains no implementation work. Stage 2 coding starts only after the discovery package is approved and approval conditions are recorded.

## Gate 0 — Discovery approval

Approve scope, architecture direction, pilot boundary, vendors as candidates and the open-decision register. Name business, clinical, legal and technical owners. Output: signed decision in `docs/README.md` or equivalent governance record.

## Workstream 1 — Governance and detailed design

- Finalize service blueprint, user stories and acceptance criteria from R-001–R-025.
- Produce legal/clinical sign-off artifacts and controlled copy.
- Define domain contracts, state machines, audit events, data classification and retention configuration.
- Complete vendor due diligence, sandbox access and contract/interface specifications.
- Create threat-model review, test strategy, incident runbook and architecture decision records.

Exit: no unresolved Critical decision affecting the pilot design.

## Workstream 2 — Secure platform foundation

- Establish repository structure, CI quality/security gates and isolated environments.
- Implement identity, staff MFA, authorization policy, consent, audit and configuration foundations.
- Provision transactional storage, private documents, queue/outbox, secrets, monitoring and backups.
- Demonstrate restoration and default-deny access before loading any real health data.

Exit: security foundation and operational evidence accepted by technical/legal owners.

## Workstream 3 — Member and clinical workflow

- Implement profile, history, questionnaires, checkup states and secure document intake.
- Implement clinician queue, source/version-aware review and two-step publish controls.
- Implement health picture, roadmap actions, member explanations, export and sharing.

Exit: clinician-approved scenarios pass with synthetic data; no autonomous clinical publication path exists.

## Workstream 4 — Commerce and operations

- Implement server-controlled catalog/pricing, orders, verified payments, refunds and reconciliation.
- Implement subscription entitlement, care tasks, reminders/preferences and support workflow.
- Implement privacy-safe Didar CRM synchronization.

Exit: failure/replay/reconciliation tests pass; approved policies match UI and receipts.

## Workstream 5 — Booking and partner results

- Implement Doctoreto/provider adapter, booking state machine and manual fallback.
- Implement partner-center order/result flow, provenance, quarantine and mismatch queue.
- Run contract, outage, duplicate, late-event and reschedule scenarios.

Exit: uncertain partner states are never represented as success; operations can resolve every exception.

## Workstream 6 — Controlled pilot readiness

- Accessibility, RTL, cross-browser, performance, security and clinical scenario QA.
- Independent penetration test and remediation.
- Backup restore, incident tabletop, vendor outage and clinical escalation exercises.
- Seed only approved configuration; train staff; verify support roster and pilot caps.
- Run go/no-go review and obtain written business, clinical, legal and technical approvals.

## Pilot and expansion gates

Pilot measures include activation, booking/service completion, roadmap action completion, review time, unresolved urgent flags, adverse events, complaints, payment mismatch, reminder delivery, support workload, repeat use, contribution margin and data/security incidents. Targets are **Requires business approval** and safety thresholds are **Requires clinical approval**.

Scale only after evidence supports safe delivery, repeat demand, positive unit economics, maintainable capacity and stable security/operations. Wearables, 24/7 services, B2B and geographic expansion require separate discovery and approval.

## Definition of done for implementation

Requirements are traceable to tests; clinical/legal copy is versioned and signed off; migrations and rollback are reviewed; no secrets or health data appear in logs; security and authorization tests pass; vendor reconciliation works; restore and incident exercises succeed; runbooks and owners exist; launch approvals are recorded.

