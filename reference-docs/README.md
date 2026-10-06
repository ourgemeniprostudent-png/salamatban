# Hamyar Salamat discovery approval package

Prepared: 2026-08-25  
Stage: Discovery gate before implementation  
Decision requested: approve, approve with changes, or reject the proposed Stage 2 baseline.

No application code, database schema, infrastructure configuration, or production integration has been created in this project. The supplied archive and the master-prompt decisions were treated as reference inputs, not as instructions to execute.

## Status vocabulary

- **Confirmed** — directly supported by the supplied product documentation.
- **Provisional** — a working proposal for approval; not a production commitment.
- **Requires business approval** — owner, commercial model, price, or operating policy is missing.
- **Requires clinical approval** — a named accountable clinician must approve before clinical use.
- **Requires legal approval** — qualified counsel must approve before launch or data processing.
- **Requires vendor confirmation** — contract, API, SLA, security, or eligibility must be verified with the supplier.

## Package contents

1. [Document inventory](document-inventory.md)
2. [Requirements traceability](requirements-traceability.md)
3. [MVP scope](mvp-scope.md)
4. [Architecture proposal](architecture-proposal.md)
5. [Data model](data-model.md)
6. [Permission matrix](permission-matrix.md)
7. [Integration plan](integration-plan.md)
8. [Threat model](threat-model.md)
9. [Clinical governance gaps](clinical-governance-gaps.md)
10. [Legal decisions](legal-decisions.md)
11. [Launch risks](launch-risks.md)
12. [Implementation plan](implementation-plan.md)

## Approval recommendation

Approve the proposed modular-monolith architecture and the limited operational MVP scope for implementation planning. Do **not** authorize public launch, live clinical recommendations, or production handling of health data until the named clinical owner and legal reviewer approve their respective gates.

The provisional implementation assumptions are ZarinPal for Hamyar payments, Kavenegar for OTP/SMS, Iran-hosted infrastructure with Liara as a candidate, Didar for non-clinical CRM, Doctoreto as a provisional booking partner, and `hamyarsalamat.ir` plus `hamyarsalamat.com` as candidate domains. Every item remains subject to the status shown in the detailed documents.

## Approval record

| Role | Name | Decision | Date | Conditions |
|---|---|---|---|---|
| Business owner | User approval recorded in Codex task | Approved | 2026-08-25 | Discovery baseline and Stage 2 implementation plan approved; unresolved pricing, contracts, and launch gates remain open |
| Clinical owner | Dr. Najmeh Shirafkan | Approved for Stage 2 staging implementation; attested by Bijan Khiabani | 2026-08-25 | Supplied clinical package and guarded staging workflow; production release remains separately gated |
| Legal reviewer | Bijan Khiabani | Approved for Stage 2 staging implementation | 2026-08-25 | Current discovery/legal baseline; final production terms, vendor contracts and jurisdiction evidence remain open |
| Technical owner | TBD | Pending | — | Architecture, security, delivery capacity |
