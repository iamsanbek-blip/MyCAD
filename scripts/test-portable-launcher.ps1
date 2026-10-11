$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'This check requires Windows.' }
$exe = (Resolve-Path 'dist/Rugby-Portable.exe').Path
$profile = Join-Path ([IO.Path]::GetTempPath()) ('rugby-portable-' + [Guid]::NewGuid())
$oldNodeEnv = $env:NODE_ENV
$oldProfile = $env:RUGBY_TEST_USER_DATA_DIR
$launcher = $null
try {
    $env:NODE_ENV = 'test'
    $env:RUGBY_TEST_USER_DATA_DIR = $profile
    $launcher = Start-Process -FilePath $exe -PassThru
    $deadline = (Get-Date).AddSeconds(90)
    $window = $null
    while ((Get-Date) -lt $deadline) {
        $window = Get-Process -Name Rugby -ErrorAction SilentlyContinue |
            Where-Object { $_.Id -ne $launcher.Id -and $_.MainWindowHandle -ne 0 -and ($_.MainWindowTitle -like '* — Rugby' -or $_.MainWindowTitle -eq 'Rugby — CNC Corner Editor') } |
            Select-Object -First 1
        if ($window) { break }
        $launcher.Refresh()
        if ($launcher.HasExited -and $launcher.ExitCode -ne 0) {
            throw "Portable launcher exited with code $($launcher.ExitCode)."
        }
        Start-Sleep -Milliseconds 500
    }
    if (-not $window) { throw 'No Rugby application window opened within 90 seconds.' }
    Start-Sleep -Seconds 3
    $window.Refresh()
    if ($window.HasExited -or $window.MainWindowHandle -eq 0) { throw 'Rugby closed immediately after startup.' }
    New-Item -ItemType Directory -Force -Path verification | Out-Null
    [ordered]@{
        status = 'passed'
        platform = 'win32'
        test = 'portable launcher opens and keeps the main application window alive'
        windowTitle = $window.MainWindowTitle
        executableSha256 = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLowerInvariant()
        gpu = 'default launch flags'
        smartAppControl = 'not tested'
        smartScreen = 'not tested; CI download has no browser Mark of the Web'
    } | ConvertTo-Json | Set-Content -Encoding utf8 verification/portable-launcher.json
    Write-Host "Portable launcher passed: $($window.MainWindowTitle)"
} finally {
    if ($launcher -and -not $launcher.HasExited) {
        & taskkill /PID $launcher.Id /T /F 2>$null | Out-Null
    }
    $env:NODE_ENV = $oldNodeEnv
    $env:RUGBY_TEST_USER_DATA_DIR = $oldProfile
    if (Test-Path $profile) { Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue }
}
