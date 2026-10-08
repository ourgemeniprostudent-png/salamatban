# Salamatban delivery conventions

The project owner requires every changed product delivery to use the established complete ZIP structure. Preserve this preference across tasks.

- Deliver one versioned `Salamatban-Complete-Delivery-v*.zip`, with a clickable download in the final response.
- Include a root `index.html` and `00-START-HERE.html` that open as ordinary files and clearly link to the online demo, documents, and local launch instructions.
- Include the built `website/`, active `source/`, Persian PDF/HTML guide, architecture/database material, operational-readiness and budget worksheets, identity/fonts, launchers, and a per-file SHA-256 manifest.
- Explain direct-file versus local-server execution in the package. Never leave `website/index.html` indefinitely loading when opened via `file:`.
- Update the guide and release evidence to match the shipped changes. Distinguish implemented features, proposals, demo behavior, and production requirements.
- Export no runtime databases, credentials, dependency caches or node_modules. Keep original supplied fonts and the independent Salamatban brand.
- Test affected behavior, ZIP integrity, source/build consistency, and entry links. Report publication separately from Git push.
- For advice-only responses no rebuilt ZIP is needed; record agreed proposals when producing the next product delivery.

- UI focus must not add outer rings or double borders. Use a subtle change to the existing border/background; keep keyboard focus identifiable through surface and text treatment. Keep the member experience visually cohesive after onboarding as well as before it.

- Keep the established blue brand across motion, icons and controls; do not introduce a green theme. Use full-width banners and responsive workspace grids. Group related intake questions with a consistent bottom action bar. Staff count cards must open/filter an actual queue, and each case/request must make its next action and resulting handoff clear.

- Use a continuous white page canvas. Do not enclose member intake/discovery/consent in a large rounded or shadowed card over a gray backdrop. Keep the content grid and control affordances; integrate the fixed action bar into the page instead of a floating card.

- Reserve space for asynchronous save/status feedback and validation before messages appear. Keep controls under the pointer, button loading labels and media geometry stable; check position changes under delayed fonts/network and errors. Intentional page changes are distinct from unexpected layout shifts.
- Keep consent and member-home artwork live, blue and transparent against the white page; provide scene-specific pause/resume and honor reduced motion. Do not restore a dark enclosing panel as a fallback.
- For a positive safety answer, prioritize an accessible urgent-assistance dialog and explicit emergency/help actions. Do not repeat a payment-block banner above intake/documents. Preserve the clinical flag and the final-review/service payment and submission gates; closing the dialog or correcting an answer never silently clears a persisted flag. Location requests must be explicit, and external map results must not be presented as verified nearest or available care.

- Keep the short product guide focused on the current experience and review paths; label retained architecture/history separately. Keep demo account selection and OTP copy controls when redesigning the photographic blue entry.
- Preserve stable city identifiers and manual entry when expanding the sourced city/province catalog. Show county context for same-name cities, and document the source date/license without claiming a current exhaustive official register.
- Urgent assistance uses the member’s actual current positive answers, including multiple answers, without inventing a diagnosis, onset or current symptom from a historical flag. Keep the dialog wide on desktop with reachable call/return controls on mobile. City hospital results may load inside the dialog with source attribution; device geolocation remains explicit. Never describe public listings as verified nearest, available or clinically suitable care.
- Use Neshan for urgent-care center search and directions. Keep REST service keys on the API server, outside the static/browser delivery. Do not silently fall back to Google Maps or OpenStreetMap for this flow. Distinguish an unconfigured gateway from an empty search, and report live activation only after a real authorized provider check. Keep emergency guidance available independently of map configuration or network access.
