# CaféSync Team Package Creator
# Creates a complete ZIP file with all necessary code for your team

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   CaféSync Team Package Creator" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$date = Get-Date -Format "yyyy-MM-dd-HHmm"
$zipName = "Cafesync-Complete-$date.zip"

# Files/Folders to exclude from the package
$exclude = @(
    'node_modules',
    '.git',
    'build',
    '*.zip',
    'temp_*',
    '.env',
    '.env.local',
    'client\build',
    'server\node_modules',
    'client\node_modules',
    'functions\node_modules',
    'root\node_modules'
)

Write-Host "Creating team package..." -ForegroundColor Yellow

# Check if 7-Zip is available (provides better compression)
$use7zip = $false
try {
    $7zipPath = Get-Command "7z" -ErrorAction Stop
    $use7zip = $true
    Write-Host "Using 7-Zip for compression..." -ForegroundColor Green
} catch {
    Write-Host "Using built-in compression..." -ForegroundColor Yellow
}

# Create temporary directory
$tempDir = "temp_package_$date"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

Write-Host "Copying files..." -ForegroundColor Yellow

# Copy project files (exclude node_modules, build, etc.)
Get-ChildItem -Path . -Exclude $exclude -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($PWD.Path.Length + 1)
    $destPath = Join-Path $tempDir $relativePath
    
    # Skip if in excluded directory
    $shouldExclude = $false
    foreach ($excluded in $exclude) {
        if ($relativePath -like $excluded -or $relativePath -match $excluded) {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        if ($_.PSIsContainer) {
            New-Item -ItemType Directory -Force -Path $destPath | Out-Null
        } else {
            $destFolder = Split-Path $destPath -Parent
            if ($destFolder -and -not (Test-Path $destFolder)) {
                New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
            }
            Copy-Item $_.FullName -Destination $destPath -Force
        }
    }
}

# Add README for team
$readmeContent = @"
# CaféSync - Complete Codebase

This package contains the complete CaféSync codebase.

## Setup Instructions

1. Extract this ZIP file to your desired location
2. Install Node.js (v16 or higher) if not already installed
3. Open PowerShell or Terminal in the project directory
4. Run the following commands:

### For Windows (PowerShell):
.\setup.ps1

### For macOS/Linux:
chmod +x setup.sh
./setup.sh

## Project Structure

- \`client/\` - React frontend application
- \`server/\` - Express backend server
- \`functions/\` - Firebase Cloud Functions
- \`firebase.json\` - Firebase project configuration

## Environment Setup

1. Copy \`env.example\` to \`.env\` in the root directory
2. Edit \`.env\` with your Firebase credentials
3. Copy \`client/env.example\` to \`client/.env.production\`
4. Edit with your production Firebase config

## Running the Application

### Development:
- Client: \`cd client && npm start\`
- Server: \`cd server && npm start\`

### Production Build:
\`cd client && npm run build\`

## Support

Refer to the documentation files:
- SETUP.md - Initial setup guide
- TEAM_SETUP_GUIDE.md - Team collaboration guide
- README.md - Project overview

---
Package created: $date
Version: 1.0.0
"@

$readmeContent | Out-File -FilePath "$tempDir\README-FOR-TEAM.txt" -Encoding UTF8

# Create ZIP
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow

if ($use7zip) {
    & 7z a -tzip "$zipName" "$tempDir\*" | Out-Null
} else {
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName -Force
}

# Get file size
$fileSize = (Get-Item $zipName).Length / 1MB

# Clean up
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "   Package Created Successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Filename: $zipName" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "This package can now be shared with your team." -ForegroundColor White
Write-Host "Share via: Google Drive, OneDrive, Dropbox, or email" -ForegroundColor White
Write-Host ""

# Offer to show the file
$showFile = Read-Host "Would you like to view the package? (y/n)"
if ($showFile -eq 'y') {
    Start-Process explorer.exe -ArgumentList "/select,$zipName"
}

