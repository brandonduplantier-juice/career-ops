# daily_scan.ps1 - career-ops ATS scanner runner
#
# Usage:
#   .\daily_scan.ps1               # scan + write brief + email
#   .\daily_scan.ps1 -DryRun       # source, filter, score, verify, print summary, write nothing, send nothing
#   .\daily_scan.ps1 -SkipEmail    # full scan + write files, skip email
#   .\daily_scan.ps1 -Quiet        # log only (Task Scheduler mode)
#   .\daily_scan.ps1 -LogFile path # custom log path

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Quiet,
    [switch]$SkipEmail,
    [string]$LogFile = ""
)

$ErrorActionPreference = "Stop"

# Always run from the project root
Set-Location -Path $PSScriptRoot

$date      = Get-Date -Format "yyyy-MM-dd"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Default log path: logs\scan-YYYY-MM-DD.log
$logsDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
if (-not $LogFile) { $LogFile = Join-Path $logsDir "scan-$date.log" }

if (-not $Quiet) {
    Write-Host "career-ops ATS scan - $timestamp"
    Write-Host "Log: $LogFile"
    Write-Host ""
}

# ── DRY RUN ───────────────────────────────────────────────────────────────────

if ($DryRun) {
    if (-not $Quiet) {
        Write-Host "DRY RUN: source, filter, score, verify - nothing will be written."
        Write-Host ""
    }

    # Use Continue so that node's expected 404 warnings on stderr don't become
    # terminating errors. Restore Stop after the call.
    $ErrorActionPreference = 'Continue'
    if ($Quiet) {
        node (Join-Path $PSScriptRoot "ats_scan.mjs") --dry-run *>> $LogFile
    } else {
        node (Join-Path $PSScriptRoot "ats_scan.mjs") --dry-run 2>&1 | Tee-Object -FilePath $LogFile -Append
    }
    $scanExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'

    if ($scanExit -ne 0) {
        if (-not $Quiet) {
            Write-Host ""
            Write-Host "ERROR: ats_scan.mjs --dry-run exited with code $scanExit. Check log: $LogFile" -ForegroundColor Red
        }
        exit $scanExit
    }

    if (-not $Quiet) {
        Write-Host ""
        Write-Host "Dry run complete. No files written, no email sent."
        Write-Host "  Log: $LogFile"
    }
    exit 0
}

# ── FULL SCAN ─────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Continue'
if ($Quiet) {
    node (Join-Path $PSScriptRoot "ats_scan.mjs") *>> $LogFile
} else {
    node (Join-Path $PSScriptRoot "ats_scan.mjs") 2>&1 | Tee-Object -FilePath $LogFile -Append
}
$scanExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'

if ($scanExit -ne 0) {
    if (-not $Quiet) {
        Write-Host ""
        Write-Host "ERROR: ats_scan.mjs exited with code $scanExit. Check log: $LogFile" -ForegroundColor Red
    }
    exit $scanExit
}

# ── EMAIL ─────────────────────────────────────────────────────────────────────

if (-not $SkipEmail) {
    if (-not $Quiet) {
        Write-Host ""
        Write-Host "Sending morning brief email..."
    }

    $briefPath = Join-Path $PSScriptRoot "data\morning_brief.json"
    if (-not (Test-Path $briefPath)) {
        if (-not $Quiet) {
            Write-Host "WARNING: data/morning_brief.json not found - email skipped." -ForegroundColor Yellow
        }
        "[$timestamp] WARNING: morning_brief.json not found, email skipped" | Out-File -FilePath $LogFile -Append -Encoding utf8
    } else {
        $ErrorActionPreference = 'Continue'
        if ($Quiet) {
            node (Join-Path $PSScriptRoot "morning_brief.mjs") *>> $LogFile
        } else {
            node (Join-Path $PSScriptRoot "morning_brief.mjs") 2>&1 | Tee-Object -FilePath $LogFile -Append
        }
        $emailExit = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($emailExit -ne 0) {
            if (-not $Quiet) {
                Write-Host "ERROR: morning_brief.mjs failed (code $emailExit). Check log: $LogFile" -ForegroundColor Red
            }
            exit $emailExit
        }
    }
}

if (-not $Quiet) {
    Write-Host ""
    Write-Host "Scan complete."
    Write-Host "  Queue:  data/daily_queue.md"
    Write-Host "  Brief:  data/morning_brief.json"
    Write-Host "  Log:    $LogFile"
}
