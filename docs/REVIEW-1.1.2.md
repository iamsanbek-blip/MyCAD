# Rugby 1.1.2 review → 1.1.1-preview.2

2026-10-20. Source: Google Drive / rugby-desktop / Rugby 1.1.2. All 13 files were downloaded and their SHA256SUMS verified before comparison. The three JS parts were joined byte-for-byte; combined SHA256: ad9b935b5df06c162de80ad288bf4a236811a3c4fae4d9c9a689bf8b65bc254d.

| Files reviewed | Finding and decision |
|---|---|
| README-Rugby-1.1.2.md, PANEL3D-1.1.2.md | UI requirements and independent 3D architecture reviewed. Adopt compact placement and export workflow. |
| panel3d.js.part1, .part2, .part3 | Reviewed joined implementation: model data, shape generation, transforms, snapping, selection, extrusion, DXF parser, contour editor, shortcuts, persistence and exports. Port specific behavior into current modules. |
| panel3d.css | Adopt narrow creation rail and right inspector/export layout; retain current brand/active-state rules. |
| menubar.js, menubar.css | Keep stable two-row navigation already present. Do not reintroduce duplicate global menu/key listeners. |
| rugby-1.1.2-modified-files.patch | Old baseline patch would overwrite newer multipage/history/file/input fixes; not applied wholesale. |
| apply-1.1.2.sh | Installer is tied to the old file layout. Not run against current source. |
| panel3d.cjs | Legacy test/validation coverage examined. Does not prove current native Windows GUI behavior. Add current migration tests instead. |
| build-web.py | Old shim changes desktop file behavior/extensions. Retain shared app source and current visible browser file fallback. |
| SHA256SUMS.txt | All supplied hashes checked successfully. |

## Adopted

- One universal panel button, oriented from active view; click to place, Escape to cancel; N scoped to Modeling. Three explicit panel orientations remain available in Panel menu.
- Compact inspector with dimensions, name/type/quantity and right-side CSV/TXT/XLSX exports; draggable property order also updates export columns.
- Thickness filtering, decimal separator, header and column-order options; clipboard text option.
- Multi-selection hide/isolate persisted in the document and covered by Undo.
- Reading legacy page.panel3d data: Y-up becomes Z-up with [x,-z,y]; contours, sizes, quantity, hidden state, orientation, reference lines and guides retained.

## Kept from the newer 1.1.1 code

Offline Three.js bundle, real 16 mm extruded solids, fractional exact A→B anchors, cursor movement plus axis handles, rectangle selection, separate stretch, transactional contour edit, per-page undo, v3 document validation, independent Drawing/Modeling shortcuts and input guards.

The old bounding-box snapping and quantization are not suitable for exact custom-contour placement. The older export serializer does not escape names reliably. Current CSV quotes/escapes cells and neutralizes spreadsheet formulas. Legacy snapshot code silently drops lines beyond 60,000 vertices; this port validates data and rejects malformed input before replacing the open document.

## Scope and limitations

Legacy reference lines remain visible references in Modeling; they are not automatically converted into editable Drawing shapes. Resave imported projects as v3 under a new name; older Rugby releases cannot read the newer data. This does not add assembly constraints, CNC toolpaths, manufacturing validation or automatic joinery. Review a cutting list before machining.

Evidence and verification boundaries: docs/TESTING.md and Windows BUILD-REPORT.json. No claim that every possible geometry, GPU or Windows configuration has been tested.
