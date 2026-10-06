# Document inventory and source authority

## Archive identity

- Source: `Hamyar_Salamat_All_Final_Deliverables_2026-08-20.zip`
- Size: 83,483,529 bytes
- SHA-256: `AF4990BB7DA502FEDA6E25503EECDB6695FE81783F62A5F5CF47C175C6E8B9F4`
- Package claim: 43 deliverables plus README and SHA-256 manifest.
- Integrity: **Confirmed** at the outer archive level. The package contains its own per-file manifest.

## Selected authoritative inputs

| Source | Use in discovery | Authority |
|---|---|---|
| `00_README/README_FA.txt` | Package structure, version notes, warnings | **Confirmed** package metadata |
| `01_Core_Strategy/hamyar-salamat-strategic-foundation-v1.docx` | Product definition, boundaries, journey, segments, revenue logic | **Confirmed** product baseline; quantitative assumptions remain provisional |
| `01_Core_Strategy/hamyar-salamat-dfd-software-architecture-v1.docx` | DFD, modules, states, security, data and integration patterns | **Confirmed** design input; technology/vendor choices require approval |
| `01_Core_Strategy/گزارش_وضعیت_و_افق_آینده_همیار_سلامت.docx` | Maturity, risks, evidence gaps, stage gates | **Confirmed** discovery evidence; not proof of market traction |
| `02_Clinical_Reference/hamyar-salamat-clinical-screening-reference-2026-v1.docx` | Clinical workflow and unresolved guideline decisions | Reference only; **Requires clinical approval** |
| Clinical PDF/PPTX v2 | Visual clinical flows | Supporting reference; **Requires clinical approval** |
| `03_MVP_and_Integrations/hamyar-doctoreto-functional-page-spec-v1.docx` | Booking flow, failure states, data minimization | **Confirmed** functional intent; **Requires vendor confirmation** |
| `03_MVP_and_Integrations/hamyar-partner-api-openapi-v1.json` | Pilot partner-center API surface | **Provisional** contract v1.0.0-pilot |
| Five HTML prototypes | User journey, UI language, sample screens | UX reference only; explicitly non-production and sample-data based |
| `hamyar-salamat-platform-phase1-v0.1.0.zip` | Prior architecture/code snapshot | Historical reference only; not imported or executed |
| `hamyar-salamat-complete-mvp-v1.zip` | Prior demo implementation | Historical reference only; not imported or executed |
| MVP video and narration | Journey/communications reference | Supporting reference, not functional evidence |
| Master prompt supplied in the conversation | Vendors, stack, entities, launch controls | **Provisional** owner direction pending this approval |

## Excluded from MVP requirements

The ZCorpa/Abidi and Spartina/OrchidLife packages are commercial/scientific proposal materials for specific partner opportunities. They are catalogued but are not authoritative requirements for the Hamyar Salamat public MVP. Any claims reused from them require separate scientific, regulatory, and legal review.

## Conflicts and caveats

- Existing prototypes simulate OTP, payment, booking, clinical review, and persistence; they do not prove operational readiness.
- Prototype prices (including 1,200,000 toman assessment and 890,000 toman/month assistance) are pilot examples, not approved production prices.
- The strategic report identifies material inconsistencies in market, financial, capacity, inflation, cash-need, and valuation assumptions. These figures must not drive implementation or external claims without a controlled model.
- Clinical and commercial documents explicitly require revalidation before external use.
- Where sources conflict, this package favors the strategic foundation and architecture document for product behavior, the clinical source only after clinician approval, and written owner decisions for commercial policy.

