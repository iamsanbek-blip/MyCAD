'use strict';
const assert = require('node:assert/strict');
const pkg = require('../package.json');
assert.equal(process.platform, 'win32', 'Build portable previews on Windows.');
assert.match(pkg.version, /-preview\./, 'Unsigned builds must be labelled preview.');
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
const {build, Platform, Arch} = require('electron-builder');

// Keep the signed production configuration intact. Use structured arguments so
// PowerShell cannot split dotted -c options into a nonexistent config filename.
build({
  targets: Platform.WINDOWS.createTarget('portable', Arch.x64),
  publish: 'never',
  config: {
    ...pkg.build,
    forceCodeSigning: false,
    win: {...pkg.build.win, signAndEditExecutable: true, signDlls: false}
  }
}).catch(error => { console.error(error); process.exitCode = 1; });
