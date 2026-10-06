# Requirements traceability

IDs below become the baseline for acceptance criteria and tests after approval.

| ID | Requirement | Source | Status | Planned verification |
|---|---|---|---|---|
| R-001 | Persian RTL responsive member experience | Prototypes, strategic foundation | **Confirmed** | Cross-device UI and accessibility tests |
| R-002 | OTP registration/login with abuse controls | Architecture, master prompt | **Confirmed** behavior; vendor provisional | Auth, rate-limit and session tests |
| R-003 | Versioned, revocable, purpose-specific consent | Strategy, architecture | **Confirmed**; **Requires legal approval** text | Consent lifecycle and audit tests |
| R-004 | Structured profile, history, medication, allergy and questionnaire | Strategy, prototypes | **Confirmed** | Validation and ownership tests |
| R-005 | Checkup order/result workflow with explicit states | Architecture | **Confirmed** | State-transition tests |
| R-006 | Secure upload, quarantine, malware scan, checksum and private access | Architecture | **Confirmed** | Security and file-pipeline tests |
| R-007 | Human clinical review before publishing health picture/roadmap | Strategy, architecture | **Confirmed**; **Requires clinical approval** | Authorization and publish-gate tests |
| R-008 | No autonomous diagnosis, prescribing or emergency replacement | Product boundary | **Confirmed** | Content, workflow and policy review |
| R-009 | Versioned health picture and 12-month roadmap | Strategy, architecture | **Confirmed** | Versioning and audit tests |
| R-010 | Self-managed or 3/6/9/12-month assistance choice | Strategy | **Confirmed**; prices **Require business approval** | Product/order tests |
| R-011 | Hamyar charges only its checkup/subscription; external care paid directly to provider | Strategy, architecture | **Confirmed** | Checkout and reconciliation tests |
| R-012 | Server-owned pricing and verified, idempotent payment callbacks | Master prompt, architecture | **Confirmed** pattern; **Requires vendor confirmation** | Payment contract and replay tests |
| R-013 | Provider search, availability, booking, confirmation, reschedule and cancellation | Doctoreto spec | **Confirmed** intent; **Requires vendor confirmation** | Adapter contract/state tests |
| R-014 | Never display a booking as confirmed before provider confirmation | Doctoreto spec | **Confirmed** | Failure and concurrency tests |
| R-015 | Retry, circuit breaker, DLQ and manual fallback for partner failures | Architecture | **Confirmed** | Fault-injection tests |
| R-016 | Reminder preferences, delivery status and opt-out | Architecture, master prompt | **Confirmed** | Notification and consent tests |
| R-017 | Medication reminders are reminders, not clinical instructions | Master prompt | **Confirmed**; content **Requires clinical approval** | Copy and workflow review |
| R-018 | CRM stores operational lead/task metadata only, never clinical data | Master prompt, architecture | **Confirmed** boundary | Field allowlist and leakage tests |
| R-019 | Member can view, export and share records under explicit grants | Strategy, architecture | **Confirmed**; **Requires legal approval** | Export/share/revocation tests |
| R-020 | RBAC plus care-team, consent, purpose and ownership checks | Architecture | **Confirmed** | Negative authorization tests |
| R-021 | Immutable audit of access, changes, sharing and clinical decisions | Architecture | **Confirmed**; retention **Requires legal approval** | Audit completeness/tamper tests |
| R-022 | Separate development, staging and production environments | Master prompt | **Provisional** architecture | Deployment evidence |
| R-023 | Monitoring, alerting, backup and restore drills | Architecture | **Confirmed** need | Operational readiness exercise |
| R-024 | Data deletion/export request workflow | Master prompt | **Confirmed** capability; policy **Requires legal approval** | End-to-end request tests |
| R-025 | Emergency/urgent symptom routing with clear non-emergency limitation | Clinical safety need | **Requires clinical approval** and **Requires legal approval** | Clinician-reviewed scenario tests |

## Stage 2 implementation evidence

| Requirement | Staging evidence as of 2026-08-25 |
|---|---|
| R-004 | Durable adult profile and versioned baseline questionnaire responses implemented and tested with synthetic identities |
| R-007 | Every submitted assessment creates a pending human clinical review; only an authorized clinician can manually publish a reviewed draft |
| R-008 | UI and API produce no diagnosis, prescription, health score or autonomous recommendation |
| R-020 | Member assessment and APIs require server-side authenticated identity and ownership lookup |
| R-021 | Onboarding and assessment submission create immutable append-only audit events |
| R-025 | Seven immediate-safety questions trigger urgent escalation, an operational task and a clear instruction not to wait online |
| R-007 / R-009 | Clinician review queue and mandatory human decision implemented; an approved normal review creates a versioned, non-published health-picture draft |
| R-020 | Clinical routes are default-deny in production and require an explicit reviewer allowlist; local development access is test-only |
| R-025 | Urgent acknowledgement does not close the open follow-up task, preserving closed-loop escalation responsibility |
| R-007 / R-009 | Clinician publication requires a human-authored summary and explicit actions; it creates an immutable published health picture plus active roadmap version 1 |
| R-009 | Protected member roadmap displays the published summary and ordered actions; synthetic end-to-end verification passed |
| R-021 | Roadmap publication appends a `roadmap.published` audit event and duplicate publication is rejected with HTTP 409 |
| R-005 | The integrated dashboard presents explicit member journey state from assessment through roadmap execution |
| R-006 | R2 upload, D1 metadata, type/size validation, checksum, quarantine, human review and approved-only download implemented; production malware scanning remains gated |
| R-009 | Member can complete or reopen an owned roadmap action with evidence history and an audit event |
| R-010 / R-012 | Server-owned 3/6/9/12-month test catalog, zero-value order, idempotent verified-test payment attempt and test subscription implemented; replay test passed |
| R-013 / R-014 | Local provider adapter creates a confirmed-test appointment only after its explicit confirmation response; past-date validation test passed |
| R-016 | Durable in-app/SMS/roadmap/appointment reminder preferences implemented; local SMS adapter records no delivery |
| R-020 | Cross-member approved-document download returned 404 and unauthenticated reminder write returned 401 |
| R-021 | Document, roadmap action, assistance, appointment and reminder changes append audit events; clinician operations view exposes recent audit activity |
| R-001 / R-005 | Member portal now follows the supplied 11-stage RTL journey reference with durable state-derived progress and next-step guidance |
| R-003 | Booking coordination consent is captured separately with goal and insurance status before a checkup order is activated |
| R-005 / R-007 | Normal intake no longer enters clinical review before results; an approved result must be explicitly submitted, while urgent intake still escalates immediately |
| R-007 / R-009 | Published health picture and 12-month roadmap are separate gated member stages, both downstream of completed human review |
| R-010 | Self-managed and active-assistance execution modes are explicit durable choices before the assistance-payment stage |
| R-012 / R-013 | Checkup activation and booking remain server-owned, zero-value/local-test states with explicit adapter confirmation and audit evidence |

## Traceability gaps

- Named business, clinical, legal and technical owners are absent.
- Final Persian consent, privacy, terms, refund, cancellation and emergency language is absent.
- Final pricing, tax/invoicing treatment, support hours and service-level commitments are absent.
- Production API contracts for Doctoreto, ZarinPal, Kavenegar and Didar are absent.
- Clinical rule sources, effective dates, applicability to Iran, approvers and review cadence are incomplete.
