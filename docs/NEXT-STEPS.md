# Keyingi ustuvor ishlar

| Daraja | Ish va aniq fayllar | Tayyorlik mezoni |
|---|---|---|
| P0 | Ishonchli kod imzosi — package.json, scripts/release-portable.cjs, scripts/verify-windows-signatures.ps1 | Nashriyotchi sertifikati/xizmati sozlanadi; tashqi EXE va ichki EXE/DLL haqiqiy timestamp'li imzo bilan tekshiruvdan o'tadi |
| P0 | Windows 11 Smart App Control va Windows 10 x64 qabul sinovi — docs/TESTING.md, main.js, preload.js | Imzolangan yakuniy EXE odatiy yuklab olingan holida ikki marta bosib ochiladi; native dialoglar va barcha funksiyalar tekshiriladi |
| P1 | Takrorlanuvchi reliz — package.json, package-lock.json, INSTALLER-QURISH.bat | Lockfile mavjud; toza Windows build va EXE SHA256 bilan natija qayd etiladi |
| P1 | Haqiqiy chizmalar regressiyasi — tests/fixtures/, t27_dxf.js, t29.js | Foydalanuvchi DXF namunalari birlik, yoy va eksport round-trip testlariga kiritiladi |
| P1 | Avtomatik tiklash — yangi autosave moduli, filemanager.js, desktop/project-files.js | Kutilmagan yopilishdan keyin tiklash taklifi; asl loyiha foydalanuvchisiz almashtirilmaydi |
| P2 | Katta hujjat tezligi — model/pages.js, model/state.js, tools/cnc.js | Real chizma hajmida ochish/varaqlash/nesting va RAM o'lchanadi; zaruratda worker ajratiladi |
| P2 | Global holatni bosqichma-bosqich qisqartirish — model/, ui/input-*.js | Har asbob aniq state/command interfeysiga o'tadi, mavjud regressiyalar saqlanadi |

Ushbu previewda bir fayldagi sahifalar, remap qilinadigan hotkeylar, fayl hayot
sikli va sahifa undo izolyatsiyasi bajarildi. Jadval chiqarishdan oldingi
tekshiruvlar hamda keyingi rivojlantirish ishlarini belgilaydi.
