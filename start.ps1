$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSCommandPath
Set-Location $repoRoot

try {
  $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
} catch {
  Write-Error "npm не найден. Установите Node.js (https://nodejs.org) и перезапустите скрипт."
  exit 1
}

Write-Host "Installing dependencies (server + client)..." -ForegroundColor Cyan
& $npm install

Write-Host "Starting backend on http://localhost:4000 ..." -ForegroundColor Green
$backend = Start-Process -FilePath $npm -ArgumentList @("run","dev") -WorkingDirectory $repoRoot -PassThru

Write-Host "Starting frontend on http://localhost:5173 ..." -ForegroundColor Green
$frontend = Start-Process -FilePath $npm -ArgumentList @("run","client") -WorkingDirectory $repoRoot -PassThru

Write-Host "Both processes started. Check the two opened consoles for logs." -ForegroundColor Yellow
Write-Host "Backend PID: $($backend.Id) | Frontend PID: $($frontend.Id)" -ForegroundColor DarkGray

Start-Sleep -Seconds 2
Write-Host "Opening site in default browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"
