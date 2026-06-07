# Subway Measurement Screen

This frontend is a portrait-first measurement screen for a fixed 27 inch 4K display. It shows the target panel dimensions, density, and multiple 5 x 5 cm reference squares for physical calibration in a fullscreen browser.

## Target display

- Resolution: 2160 x 3840 px
- Orientation: portrait
- Panel size: 27 inch, 16:9
- Derived density: about 163.2 ppi and 64.2 px/cm
- Reference square: 5 x 5 cm, rendered as a 321 px edge

## Commands

```bash
npm install
npm run dev
```

The frontend expects the backend API to be running as well.

Start the backend from the repository root:

```bash
cd ../backend
npm start
```

For a production check:

```bash
npm run build
npm run preview
```

## Notes

- The layout is optimized for a portrait fullscreen browser surface.
- The square size is calculated for the known display geometry, so browser zoom should remain fixed at 100% on the target hardware.
- If the installed panel differs slightly because of scaling or kiosk settings, calibrate once on-device and keep that setup locked.
- Family members are persisted through the backend API instead of browser-local storage.
- Widget metadata is also loaded from the backend API so widget titles, colors, scope, placements, and source locations are centrally stored.
