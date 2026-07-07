# HVF Trainer Pro v4.0.0

A production-style, iPad-ready Progressive Web App for **educational Humphrey-style visual field training**.

> **Educational use only:** This is not a medical device and is not for diagnosis, screening, treatment decisions, or patient records.

## Highlights

- Installable iPad PWA with offline support
- 24-2, 30-2, and 10-2 training modes
- SITA-like educational strategy, screening mode, and full-threshold-style training mode
- Mid-gray bowl background and single central fixation target
- No extra blue cursor/dot during testing
- White timed stimuli with adjustable flash duration
- Touch, mouse, keyboard, Bluetooth keyboard, and adaptive switch-style input
- Blind-spot fixation checks
- False-positive and false-negative catch trials
- Simulated glaucoma, central scotoma, neurologic, rim artifact, and unreliable fields
- Reliability indices, mean response time, threshold map, grayscale map, and deviation-style map
- Printable/copyable/exportable simulated report
- GitHub Pages workflow included

## Folder structure

```text
.
├── index.html
├── manifest.json
├── service-worker.js
├── src/
│   ├── app.js
│   └── styles.css
├── assets/icons/
├── docs/
├── .github/workflows/pages.yml
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Deploy with GitHub Pages

### Recommended desktop Git workflow

```bash
git init
git add .
git commit -m "Initial HVF Trainer Pro v4.0.0"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hvf-trainer-pro.git
git push -u origin main
```

Then in GitHub:

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions**.
3. Wait for the workflow to complete.
4. Open the Pages URL on iPad Safari.
5. Tap **Share → Add to Home Screen**.

### Browser upload

On macOS, drag the entire unzipped folder contents into GitHub's **Add file → Upload files** area. This should preserve folders in Safari/Chrome/Firefox. If your browser flattens folders, use the separate flat iPad-upload package instead.

## Local testing

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

For iPad testing on the same Wi-Fi network:

```bash
ipconfig getifaddr en0
```

Then open `http://YOUR-MAC-IP:8000`.

## Clinical disclaimer

HVF Trainer Pro does not implement proprietary Humphrey SITA algorithms, validated normative databases, calibrated Goldmann stimulus luminance, clinical gaze tracking, or medical-device quality controls.


## v4.0.0 view behavior

- **Settings** opens the left slide-over panel.
- **Report** opens the right slide-over panel.
- **Test View** closes all panels and returns to the circular test bowl.
- **Reset View** forcibly closes panels and redraws the bowl.
- **Esc** also closes panels if using a keyboard.


## v4.0.0 panel behavior

- **Settings** toggles the left panel only.
- **Report** toggles the right panel only.
- Both panels can be open at the same time.
- Each panel's **Close** button closes only that panel.
- **Test View** and **Reset View** close both panels.


## v4.0.0 test patterns

- **15 Flash Check**: quick 15-stimulus functional check to verify the app, response button, plotting, and report display.
- **24-2**: standard-style central field pattern extending about 24 degrees from fixation, with points spaced in an offset grid.
- **30-2**: wider central field pattern extending about 30 degrees from fixation.
- **10-2**: dense central pattern within about 10 degrees of fixation, useful for central/paracentral training.


## v4.0.0 quick check

**15 Flash Check** now runs exactly 15 visible stimulus trials and does not add catch trials, so it is useful for fast app/function verification.


## v4.0.0 quick-check fix

The **15 Flash Check** now uses a hard scheduler override and should show `Running 1/15` through `Running 15/15`. If an iPad still shows 117, delete and re-add the Home Screen icon or clear Safari website data for the GitHub Pages site so the older service-worker cache is removed.


## v4.0.0 quick-check fix

The core scheduler itself now handles **15 Flash Check**, so when opened directly from the HTML file in Firefox it should display `Running 1/15` through `Running 15/15`.


## v4.0.0 PDF printing

Use **Report → Print / PDF** after the test completes. The PDF layout now hides the test bowl and prints the numerical report plus all three plots.


## v3.6
Core FP/FN accounting functions were replaced directly. For 15 Flash Check, top live rows now show FN-like missed flashes and FP-like extra presses.


## v4.0 point-count options

Clinical Mode now supports both authentic standards and shorter training variants:

- Pattern: 24-2, 30-2, or 10-2
- Point count: Clinical standard, 10, 20, 40, 60, 80, 100, 120, or 140

Clinical standard preserves the original pattern layout. Numeric counts generate a deterministic evenly distributed set inside the selected pattern's visual-field extent.
