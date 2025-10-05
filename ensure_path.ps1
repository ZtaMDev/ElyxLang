<#
ensure_path.ps1
Checks whether a given path is present in the user's or system PATH and optionally adds it.
Usage (user PATH):
  .\ensure_path.ps1 -PathToAdd 'C:\Program Files\Elyx'
Usage (system PATH - requires admin):
  Start-Process -Verb RunAs powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File .\\ensure_path.ps1 -PathToAdd "C:\\Program Files\\Elyx" -System'
#>
param(
    [string]$PathToAdd = 'C:\Program Files\Elyx',
    [switch]$System
)

function PathContains($haystack, $needle) {
    if (-not $haystack) { return $false }
    return $haystack.ToUpper().Split(';') -contains $needle.ToUpper()
}

if ($System) {
    # system path (requires admin)
    $regPath = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment'
    try {
        $current = (Get-ItemProperty -Path $regPath -Name Path -ErrorAction Stop).Path
    } catch {
        $current = ''
    }
    if (PathContains $current $PathToAdd) {
        Write-Host "System PATH already contains '$PathToAdd'"
        exit 0
    }

    Write-Host "Adding '$PathToAdd' to SYSTEM PATH (requires admin)"
    $new = if ($current -and $current.Trim().Length -gt 0) { "$current;$PathToAdd" } else { $PathToAdd }
    Set-ItemProperty -Path $regPath -Name Path -Value $new
    Write-Host "Wrote SYSTEM PATH. You may need to log out/in for all processes to see the change."

    # Broadcast environment change (best effort)
    try {
        $sig = @'
using System;
using System.Runtime.InteropServices;
public static class Win32 {
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, UInt32 Msg, UIntPtr wParam, string lParam, UInt32 fuFlags, UInt32 uTimeout, out UIntPtr lpdwResult);
}
'@
        Add-Type -TypeDefinition $sig -ErrorAction SilentlyContinue
        [UIntPtr]$result = [UIntPtr]::Zero
        [void][Win32]::SendMessageTimeout([IntPtr]::Zero -bor 0xFFFF, 0x1A, [UIntPtr]::Zero, 'Environment', 0x2, 5000, [ref]$result)
    } catch {
        # ignore
    }
    exit 0
} else {
    # user path (setx is simpler and immediate for new processes)
    try {
        $current = (Get-ItemProperty -Path 'HKCU:\Environment' -Name Path -ErrorAction Stop).Path
    } catch {
        $current = ''
    }
    if (PathContains $current $PathToAdd) {
        Write-Host "User PATH already contains '$PathToAdd'"
        exit 0
    }
    Write-Host "Adding '$PathToAdd' to USER PATH using setx (no admin required)"
    if ($current -and $current.Trim().Length -gt 0) {
        $new = "$current;$PathToAdd"
    } else {
        $new = $PathToAdd
    }
    # setx truncates to 1024 chars on older Windows; we warn if PATH is large
    if ($new.Length -gt 1000) { Write-Warning "Resulting PATH is long (>$($new.Length) chars). setx may truncate on old Windows versions." }
    setx PATH "$new" | Out-Null
    Write-Host "Wrote USER PATH. Open a new shell to see the change."
    exit 0
}
