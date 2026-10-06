# Threat model

## Protected assets and trust boundaries

Highest-value assets are health records and documents, identity/contact data, consent evidence, clinical decisions, payment/order integrity, staff privileges, signing/encryption secrets and audit trails. Trust boundaries exist at browsers, staff portals, API edge, workers/queues, database, object storage, CRM, SMS, payment, booking/provider systems and administrative support channels.

## Priority threats

| Threat | Likely consequence | Required controls | Residual gate |
|---|---|---|---|
| OTP abuse/account takeover | Exposure or alteration of health data | Rate/attempt limits, short TTL, replay prevention, device/risk signals, session revocation, anomaly alerting | Recovery policy approval |
| Broken object/record authorization | Cross-member clinical disclosure | Central policy checks, ownership/care-team/consent ABAC, negative tests, opaque IDs | Penetration test |
| Staff privilege misuse | Broad unauthorized access | Least privilege, MFA, separation of duties, break-glass control, immutable audit, periodic review | Named reviewers |
| Public or guessed document URL | Medical-document leak | Private buckets, short signed URLs, authorization before issue, encryption, no index/list access | Storage vendor validation |
| Malicious upload | Malware, parser exploit or stored content attack | Type/size limits, quarantine, AV/CDR where suitable, checksum, safe rendering, isolated processing | Scanner/operator selection |
| Webhook spoofing/replay | False payment, booking or result | Signature verification, timestamp/nonce window, raw-body validation, idempotency and reconciliation | Vendor protocol confirmation |
| Payment tampering | Incorrect entitlement/refund or fraud | Server price/order snapshot, provider-side verification, integer rial, callback replay defense, ledger/reconciliation | Finance policy |
| Partner data over-sharing | Privacy breach and contractual exposure | Field allowlists, purpose/consent checks, adapter isolation, payload tests, retention limits | Legal/DPA review |
| Clinical rule/config tampering | Unsafe guidance | Versioned signed releases, dual approval, source/effective date, audit, rollback, scenario tests | Clinical owner |
| CRM leakage | Sensitive data in third-party CRM | Schema allowlist, no free clinical text/files, DLP tests, redaction and periodic audit | CRM contract/review |
| Sensitive logs/backups | Secondary disclosure | Structured redacted logs, encrypted backups, key separation, access audit, restore environment controls | Retention/jurisdiction |
| Dependency/supply-chain compromise | Code/data compromise | Lockfiles, provenance, SCA, secret scan, protected CI, signed artifacts, rapid patch process | CI design |
| Availability/ransomware | Interrupted service or unavailable records | WAF/rate limits, isolated backups, restore drills, incident runbooks, vendor exit plan | RPO/RTO approval |
| Insider or support impersonation | Unauthorized changes/export | Verified support workflow, step-up auth, no secrets by chat/SMS, high-risk approval | Training and monitoring |

## Safety-security interaction

Security failures can create clinical harm. An unavailable or corrupted roadmap, false result, lost escalation, or misleading confirmed booking must trigger a safe, visible operational state. The interface must disclose delays and direct urgent users to approved emergency pathways rather than claiming successful service.

## Pre-launch security evidence

Data-flow and asset register; security architecture review; abuse cases; secrets/key inventory; access-review evidence; SAST/SCA/secret-scan results; API authorization and webhook tests; file-upload assessment; backup/restore drill; incident tabletop; vendor security evidence; independent penetration test and remediation report.

