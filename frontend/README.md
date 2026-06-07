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

For a production check:

```bash
npm run build
npm run preview
```

## Notes

- The layout is optimized for a portrait fullscreen browser surface.
- The square size is calculated for the known display geometry, so browser zoom should remain fixed at 100% on the target hardware.
- If the installed panel differs slightly because of scaling or kiosk settings, calibrate once on-device and keep that setup locked.
