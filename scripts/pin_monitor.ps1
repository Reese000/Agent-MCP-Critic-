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

    $process = Get-Process | Where-Object { $_.MainWindowTitle -eq $Title } | Select-Object -First 1

    if ($process) {
        Write-Host "[SYSTEM] Found window. Pinning to Top..."
        $hwnd = $process.MainWindowHandle
        if ($hwnd -ne [IntPtr]::Zero) {
            [Win32.Win32Functions]::SetWindowPos($hwnd, [IntPtr](-1), 0, 0, 0, 0, $flags)
        } else {
            Write-Host "[WARNING] Window handle not found."
        }
    } else {
        Write-Host "[WARNING] Could not find window with title: $Title."
    }
} catch {
    Write-Host "[ERROR] Window pinning logic failed: $_"
}
