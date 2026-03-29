# pin_monitor.ps1
# Set the CLI monitor window to TopMost (Pinned)

$Title = "MACO Swarm CLI Monitor"
Write-Host "[SYSTEM] Searching for window: $Title..."

# Allow the window to settle
Start-Sleep -Seconds 1.5

try {
    $sig = @'
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
'@

    $type = Add-Type -MemberDefinition $sig -Name "Win32Functions" -Namespace "Win32" -PassThru -ErrorAction SilentlyContinue

    # HWND_TOPMOST = -1
    # SWP_NOSIZE = 1, SWP_NOMOVE = 2
    $flags = 0x0001 -bor 0x0002

    $maxRetries = 5
    $retryDelay = 1.0 # seconds
    $process = $null

    for ($i = 0; $i -lt $maxRetries; $i++) {
        $process = Get-Process | Where-Object { $_.MainWindowTitle -eq $Title } | Select-Object -First 1
        if ($process -and $process.MainWindowHandle -ne [IntPtr]::Zero) {
            break
        }
        Write-Host "[SYSTEM] Window not ready yet, retrying... ($($i+1)/$maxRetries)"
        Start-Sleep -Seconds $retryDelay
    }

    if ($process -and $process.MainWindowHandle -ne [IntPtr]::Zero) {
        Write-Host "[SYSTEM] Found window. Pinning to Top..."
        $hwnd = $process.MainWindowHandle
        [Win32.Win32Functions]::SetWindowPos($hwnd, [IntPtr](-1), 0, 0, 0, 0, $flags)
    } else {
        Write-Host "[WARNING] Could not find or access window with title: $Title."
    }
} catch {
    Write-Host "[ERROR] Window pinning logic failed: $_"
}
