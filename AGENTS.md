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
