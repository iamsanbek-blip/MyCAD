# Working on Rugby Desktop

Read README.md and HUJJAT.md first. The detailed extension guide is
docs/ARCHITECTURE.md. This is a desktop Electron project, not a hosted website.

- Renderer scripts share globals and load in the order in app/index.html.
- Register customizable commands in app/js/ui/shortcuts.js. Keep only contextual
  drawing input (Esc, Enter, numeric input) in input-keys.js.
- Add persisted page fields in document-codec.js and pages.js together; add a
  round-trip behavioral test when changing the document schema.
- Keep filesystem operations in desktop/ and main.js, exposed through preload.js.
  Preserve contextIsolation and nodeIntegration:false.
- Run npm run check and npm test after functional changes. These need Node only;
  npm install is needed for Electron/builds, not for those tests.
- tests/browser-harness.cjs uses DOM/canvas doubles. Passing it is not evidence
  of native Windows rendering or installer behavior.
- Update docs/TESTING.md with actual verification. Do not mark manual checks done
  without running them. Keep generated installers and archives out of source.

