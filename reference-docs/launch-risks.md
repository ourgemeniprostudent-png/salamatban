# Launch risk register

Scoring is qualitative for discovery. Owners and target dates must be assigned at approval.

| Priority | Risk | Current assessment | Required mitigation / launch gate |
|---|---|---|---|
| High | Clinical package approved for staging but production rule releases lack per-version evidence | Unsafe or untraceable clinical publication | Dr. Najmeh Shirafkan to approve the production rule register, triage and release process with traceable evidence |
| Critical | Staging legal baseline approved but production legal map/contracts remain unfinished | Unknown licensing, privacy and contract exposure | Bijan Khiabani to approve final documents and obtain qualified Iranian legal validation where required |
| Critical | Demo mistaken for operational product | False confidence in OTP, payments, booking and persistence | Treat prototypes as UX references; build/test operational controls after approval |
| High | Vendor eligibility/API/contract unavailable | Core journey fails or launches non-compliantly | Confirm ZarinPal, Kavenegar, Doctoreto, Didar and hosting in writing; retain manual fallback |
| High | Clinical content not localized/current | Harmful or misleading guidance | Versioned sources, specialty review, scenario testing and scheduled updates |
| High | Health-data breach | Patient harm, trust loss and legal exposure | Least privilege, private storage, encryption, audit, vendor review and penetration test |
| High | Unclear emergency/after-hours behavior | Delayed care | Approved red-flag content, escalation runbook and clear service limitations |
| High | Payment/booking state mismatch | Financial loss and patient confusion | Idempotency, verified callbacks, reconciliation, visible pending states and ops queue |
| High | Unapproved pricing/refund/subscription model | Disputes and bad unit economics | Owner-approved catalog, integer-rial prices, policy snapshots and financial controls |
| High | Financial/market assumptions are inconsistent | Overbuilding or inadequate funding | Rebuild bottom-up pilot model; separate users, subscribers, visits, revenue and capacity |
| Medium | Capacity and review SLA unproven | Backlogs and quality decline | Limited cohort, workload measurement, caps and stop/go thresholds |
| Medium | CRM receives clinical data | Third-party disclosure | Strict field allowlist, automated tests and periodic audit |
| Medium | Single vendor/channel dependency | Service interruption or commercial leverage | Adapter isolation, export rights, fallback and exit plan |
| Medium | Domain/trademark unavailable | Launch delay or rebrand | Verify and acquire under company-controlled accounts before public communications |

## No-go conditions

Public launch is prohibited while any Critical risk is open. A controlled pilot is also prohibited without named business, clinical, legal and incident owners; approved participant criteria and consent; verified secure environment; tested backup/restore; operational escalation; and evidence that all live integrations fail safely.

## Stop conditions during pilot

Serious clinical incident; suspected material data breach; repeated unowned urgent flags; inability to restore records; uncontrolled payment mismatch; loss of clinical supervision; vendor contract/authorization withdrawal; or metrics exceeding clinician-approved safety thresholds.
