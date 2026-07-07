# Changelog

## 4.0.0 — 2026-07-05

### Added
- Added **Clinical/training point count** selector.
- Clinical patterns can now be run at Clinical standard, 10, 20, 40, 60, 80, 100, 120, or 140 selected locations.
- Numeric point counts work with 24-2, 30-2, and 10-2 while preserving the selected field extent.
- 15 Flash Check remains a separate exact 15-flash functional check.


## 3.6.0 — 2026-07-05

### Fixed
- Replaced core accounting functions directly.
- 15 Flash Check live rows now show missed/FN-like and extra/FP-like values.
- Example: Stimuli 15, Seen 12 now displays False negatives: 3 / 15 missed.
- Report uses the same accounting as the live panel.


## 2.9.0 — 2026-07-05

### Fixed
- Print/PDF now outputs the report panel instead of the circular test field.
- Numerical reliability data, report text, threshold map, grayscale map, and deviation map are forced visible in print layout.
- Print button now rebuilds report text and redraws maps immediately before opening the print dialog.


## 2.8.0 — 2026-07-05

### Fixed
- Replaced the original `pointsFor()` and `buildSchedule()` functions directly.
- **15 Flash Check** now creates exactly 15 points and exactly 15 scheduled trials inside the core scheduler.
- Removed late quick-check override code that could be bypassed or ordered incorrectly.


## 2.7.0 — 2026-07-05

### Fixed
- Hard-fixed **15 Flash Check** so it schedules exactly 15 total trials.
- The override now catches both old `20-check` and new `15-check` internal values.
- Removed older quick-check scheduling overrides that could still create 117 trials.
- Updated service-worker cache version to force new deployment.


## 2.6.0 — 2026-07-05

### Fixed
- Replaced **20 Flash Check** with **15 Flash Check**.
- Quick check now schedules exactly 15 stimulus flashes.
- Quick check no longer adds reliability/catch-trial flashes.


## 2.5.0 — 2026-07-05

### Added
- New **20 Flash Check** test pattern for quick verification.
- Report panel now has labeled map blocks for threshold, grayscale, and deviation-style plots.

### Fixed
- Report panel no longer shows only the circular visual field.
- Report maps are forced to render as normal square plots.
- Opening Report forces maps and report text to redraw.


## 2.4.0 — 2026-07-05

### Changed
- Settings and Report now toggle independently.
- Opening Settings no longer closes Report.
- Opening Report no longer closes Settings.
- Each panel's Close button closes only that panel.
- Test View / Reset View still close both panels and return to the circular bowl.


## 2.3.0 — 2026-07-05

### Fixed
- Removed the problematic Focus mode that caused blank gray screens on iPad.
- Replaced it with safe **Test View** and **Reset View** buttons.
- Settings and Report are now slide-over overlays with visible **Close** buttons.
- The visual field canvas remains visible behind overlays and stays circular.
- Right panel is compact and scrollable to fit iPad screen height.


## 2.0.0 — 2026-07-05

### Added
- Production-quality simulator interface
- Desktop Git repository edition
- Flat browser-upload edition
- iPad PWA support with service worker
- 24-2, 30-2, and 10-2 training modes
- SITA-like, screening, and full-threshold educational strategies
- Mid-gray field background
- Single central fixation target
- Adjustable flash and response timing
- Simulated defect patterns
- Reliability indices and mean response time
- Threshold, grayscale, and deviation-style maps
- Printable/copyable/exportable simulated report
- GitHub Pages workflow for desktop Git edition
