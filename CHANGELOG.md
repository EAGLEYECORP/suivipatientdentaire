# Changelog

## [1.1.0] — World-class foundation

### Added
- **Ordres de laboratoire** : full lifecycle tracking (draft → sent → manufacturing → received → tried → seated) for crowns, bridges, veneers, inlays, removable prostheses, surgical guides, night guards and ortho appliances. Shade, material, lab instructions and tooth mapping included.
- **Traçabilité de stérilisation** : regulatory cycle log (autoclave / dry heat / chemical) with temperature, duration, chemical & biological indicators, operator and instrument list. Conform / non-conform validation workflow.
- **Templates de communication** : ready-to-use SMS, email and letter templates for appointment reminders, post-treatment follow-up, quote follow-up and recall.
- **Product vision** (`docs/product/VISION.md`) : clear north-star principles and competitive positioning.
- **Voice dictation helper** (`src/lib/voice.ts`) : Web Speech API wrapper ready for clinical notes (Chrome / Edge / Safari).
- Expanded tooth states: veneer, inlay/onlay, sealant, temporary prosthesis.

### Changed
- Data model version bumped to 4 with safe migration.
- Patient deletion cascades to lab orders.
- README updated to reflect new modules and world-class positioning.

### Technical
- New domain types: `OrdreLab`, `CycleSterilisation`, `TemplateCommunication`.
- Full AppContext actions for lab orders and sterilization cycles.
- Immutable journal events for all new mutations.
