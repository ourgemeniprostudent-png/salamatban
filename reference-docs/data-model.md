# Conceptual data model

This is a discovery model, not a database schema.

## Core aggregates

| Aggregate | Principal records | Main invariants |
|---|---|---|
| Identity | User, UserRole, Session, OTPAttempt | Unique verified contact; short-lived challenges; revoked sessions cannot act |
| Consent | ConsentDefinition, UserConsent, DataSharingGrant | Version, purpose, scope, grantee, timestamps and revocation are retained |
| Member | UserProfile, MedicalHistory, Medication, Allergy | Member ownership; provenance and change history for health data |
| Assessment | QuestionnaireDefinition, QuestionnaireResponse | Definition/version fixed for submitted response |
| Commerce | Product, Price, Order, PaymentAttempt, Refund | Money stored as integer rial; server price snapshot; verified state transitions |
| Provider operations | Provider, Service, Appointment | Internal ID separate from external references; confirmation comes from provider |
| Documents | MedicalDocument | Private object key, checksum, type, source, scan state and immutable versions |
| Clinical work | ClinicalReview, ClinicalRule, ClinicalRuleVersion | Named reviewer/approver; source/effective date; released versions immutable |
| Guidance | HealthPicture, HealthPictureItem, Roadmap, RoadmapAction | Published artifacts versioned; actions retain rationale and completion evidence |
| Subscription | Subscription | Paid entitlement, dates, status and change reason are consistent |
| Communications | ReminderPreference, Notification | Consent/preference checked at send; delivery and opt-out recorded |
| Operations | CareTask, SupportInteraction, CRMMapping | Only minimum operational data leaves the clinical system |
| Compliance | AuditEvent, DataExportRequest, DataDeletionRequest | Actor, purpose, subject, result and correlation retained; approvals documented |

## Essential relationships

- A user has roles, sessions, consent decisions and one member profile where applicable.
- A submitted questionnaire points to the exact definition version used.
- An order contains immutable price and policy snapshots; payment attempts never overwrite one another.
- An appointment belongs to a roadmap action where applicable and keeps partner references separately.
- A medical document belongs to a member and may support a clinical review; released versions are superseded, not overwritten.
- A health picture is produced from approved evidence and review; a roadmap references its source health-picture version.
- A roadmap action has a due window, owner, status, rationale, completion rule and evidence.
- A data-sharing grant controls a specific recipient, scope, purpose and validity period.

## Sensitive-data classification

- Restricted clinical: history, medication, allergy, questionnaire answers, results, documents, reviews, health pictures and roadmaps.
- Restricted identity: phone, national identifier if approved, date of birth and contact details.
- Confidential operational: orders, payments, appointments, tasks and support interactions.
- Security/audit: sessions, OTP metadata, access logs and integration attempts.
- Public/configuration: approved product copy, consent definitions without member decisions, provider directory fields approved for publication.

## Retention and deletion

Exact retention is **Requires legal approval**. The architecture proposes configurable retention by record type, legal hold, restricted deletion, export history and non-destructive clinical versioning. Audit integrity must be preserved while honoring legally valid correction/deletion rights. A suggested seven-year audit period in the source is not approved policy.

## Interoperability

Internal concepts should align with Member/Patient, Encounter, Observation, DiagnosticReport, MedicationRequest, CarePlan and Appointment semantics. Full FHIR conformance is out of MVP scope; adapters perform explicit mappings and retain provenance.

