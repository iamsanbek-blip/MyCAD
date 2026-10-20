# Selected 1.1.2 improvements merged into Rugby Web 1.1.1

Source reviewed: attached Rugby-1.1.2-Source.zip, particularly docs/PANEL3D-1.1.2.md, app/js/tools/panel3d.js and app/css/panel3d.css. Original archive unchanged.

## Adopted
- Compact 3D workspace: toolbar above, 190px template rail left, 280px inspector right, status below. The unrelated 2D sidebar is hidden in 3D. A toolbar button hides both rails for a larger viewport. Project save/open and page navigation remain accessible.
- True orthographic front/side/top views; perspective isometric view. Shared Three.js r180 renderer retained.
- Selection without transform gizmo, wireframe inspection, adjustable translation step with Ortho. Physical panel thickness remains visible and never flattened.
- Inspector rows draggable via grip, with up/down alternatives; local order persists without recreating input nodes.
- Positive integer quantity, default 1; one representative panel in the scene, quantity used in cut list. Quantity survives .dbe roundtrip and undo/redo.
- Cut-list thickness filter and CSV delimiter, decimal separator and header options. Existing independent export-column order remains available.

## Retained from existing Web 1.1.1
Three orientation icons; precise source-to-target anchor placement and Space toggle; independent thickness under scale; temporary 2D contour editing with original-drawing restore; shared multi-page history and .dbe v3 scene3d data.

## Deliberately not transplanted
The archive's independent panel3d v2 storage/undo engine, old Three.js r128 copy, thickness flattening, whole-cabinet stretching and automatic smallest-dimension extrusion. These need separate migration/geometry work and would otherwise replace or conflict with existing page data, orientation conventions and exact thickness behavior. Multi-select/group editing and direct 1.1.2 panel3d-document import are not part of this selective merge.

## Verification
Syntax/assets check and all existing Node regressions passed. Eleven focused adapter/export/Three.js math tests passed, including quantity roundtrip+undo, contour isolation, anchor precision, 16mm thickness, orthographic projection and export options. HTML nesting and unique IDs checked. Supported graphical browser tooling unavailable; visual and physical mouse-interaction QA not performed. No Windows EXE generated.
