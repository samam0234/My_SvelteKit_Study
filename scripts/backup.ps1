param([string]$Destination = "backups")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$containerId = docker compose ps -q db
if (-not $containerId) { throw 'PostgreSQL container is not running' }
docker compose exec -T db pg_dump -U pine -d pine -Fc -f /tmp/pine.dump
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed' }
docker cp "${containerId}:/tmp/pine.dump" (Join-Path $Destination "$stamp.dump")
if ($LASTEXITCODE -ne 0) { throw 'docker cp failed' }
Write-Output "Backup created: $stamp.dump (restore into a separate database first)"
