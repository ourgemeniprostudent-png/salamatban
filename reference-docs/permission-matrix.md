# Permission matrix

Authorization combines role, ownership/care-team assignment, active consent, purpose, record sensitivity and workflow state. Authentication alone never grants clinical access.

Legend: V=view, C=create, U=update, A=approve/publish, X=export/share, O=operational metadata only, —=denied by default.

| Resource | Member | Assigned clinician | Clinical owner | Operations | Support | Admin | Integration |
|---|---:|---:|---:|---:|---:|---:|---:|
| Own profile/consent | V/C/U/X | V when required | V when required | O | O | — | Minimum scoped fields |
| Clinical history/results | V/C/X | V/C/U | V/C/U/A | — | — | Break-glass only | Contract-scoped ingestion |
| Clinical review/rules | View released summary | V/C/U assigned | V/C/U/A | — | — | Config metadata | — |
| Health picture/roadmap | V/X | V/C/U assigned | V/C/U/A | O for task coordination | O | — | — |
| Appointment | V/C/U | V | V | V/C/U | O | Config/report | Booking scope only |
| Order/payment | V/C | — | — | V/U/refund request | O | Policy/config | Payment scope only |
| Subscription | V/C/cancel request | — | — | V/U per policy | O | Policy/config | — |
| Documents | V/C/X own | V assigned | V/A | Metadata only | — | Break-glass only | Upload/result scope only |
| Care task/support | Own visible status | Assigned tasks | Oversight | V/C/U | V/C/U | Report/config | — |
| Audit | Own access report if approved | Own actions | Clinical audit | Operational subset | Own actions | Security/compliance scope | Write-only events |
| User/role administration | Own sessions | — | — | — | — | V/C/U with separation of duties | — |

## Mandatory controls

- Staff use MFA and shorter sessions; member OTP has rate limits, attempt limits, replay protection and secure recovery.
- Clinicians see only actively assigned care-team members and only for an approved purpose.
- Operations and Didar CRM do not receive clinical values, diagnoses, result files or free-text clinical notes.
- Admins do not have default content access. Break-glass access requires reason, time limit, alert and retrospective review.
- Exports and sharing require step-up authentication and a recorded grant.
- High-risk actions—clinical publication, refunds above threshold, role elevation, mass export, retention override—require separation of duties or secondary approval.
- All allow/deny decisions for sensitive operations create audit evidence without logging clinical payloads.

## Approval gaps

Role titles, staffing model, support visibility, break-glass approvers, refund thresholds and separation-of-duty rules are **Requires business approval**. Clinical access purposes and reviewer delegation are **Requires clinical approval**. Access-reporting rights and audit retention are **Requires legal approval**.

