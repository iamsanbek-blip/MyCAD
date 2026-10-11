param(
  [string]$Portable = "$PSScriptRoot\..\dist\Rugby-Portable.exe",
  [string]$Runtime = "$PSScriptRoot\..\dist\win-unpacked"
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Portable -PathType Leaf)) { throw "Portable EXE not found: $Portable" }
if (-not (Test-Path -LiteralPath $Runtime -PathType Container)) { throw "Runtime folder not found: $Runtime" }
$files = @(Get-Item -LiteralPath $Portable) + @(Get-ChildItem -LiteralPath $Runtime -Recurse -File | Where-Object { $_.Extension -in '.exe','.dll' })
$results = @($files | ForEach-Object {
  $signature = Get-AuthenticodeSignature -LiteralPath $_.FullName
  [PSCustomObject]@{
    Path = $_.FullName
    Status = [string]$signature.Status
    Signer = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
    Timestamp = if ($signature.TimeStamperCertificate) { $signature.TimeStamperCertificate.Subject } else { $null }
  }
})
$results | ConvertTo-Json -Depth 3
if (@($results | Where-Object { $_.Status -ne 'Valid' -or -not $_.Timestamp }).Count -gt 0) {
  throw 'Release blocked: every executable/DLL needs a valid timestamped signature. Do not redistribute an unsigned build as a Windows fix.'
}
Write-Output 'Signature checks passed. Smart App Control enforcement testing on Windows is still required.'

