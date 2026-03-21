# Run from your project root: .\Generate-CodeDump.ps1

$projectRoot = Get-Location
$outputFile = Join-Path $projectRoot "BataMart-Code.html"

$extensions = @("*.tsx", "*.ts", "*.prisma", "*.css", "*.json")
$excludeDirs = @("node_modules", ".next", ".git")
$excludeFiles = @(".env", ".env.local", ".env.production", ".env.development")
$excludeJsonFiles = @("package-lock.json", "yarn.lock", "pnpm-lock.yaml")

Write-Host "Scanning files..." -ForegroundColor Cyan

$allFiles = @()
foreach ($ext in $extensions) {
    $files = Get-ChildItem -Path $projectRoot -Filter $ext -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $file = $_
        $excluded = $false
        foreach ($dir in $excludeDirs) {
            if ($file.FullName -like "*\$dir\*") { $excluded = $true; break }
        }
        if ($file.Extension -eq ".json") {
            foreach ($ej in $excludeJsonFiles) {
                if ($file.Name -like $ej) { $excluded = $true; break }
            }
        }
        foreach ($ef in $excludeFiles) {
            if ($file.Name -like $ef) { $excluded = $true; break }
        }
        -not $excluded
    }
    $allFiles += $files
}

Write-Host "Found $($allFiles.Count) files. Writing HTML..." -ForegroundColor Green

$blocks = @()

foreach ($file in $allFiles) {
    $relativePath = $file.FullName.Replace($projectRoot.Path + "\", "").Replace("\", "/")
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8 -ErrorAction Stop
        if ($null -eq $content) { $content = "" }
    } catch {
        $content = "Could not read file."
    }

    # Escape HTML special chars
    $content = $content -replace '&', '&amp;'
    $content = $content -replace '<', '&lt;'
    $content = $content -replace '>', '&gt;'

    $blocks += "<div class='file-block'><div class='file-header'>$relativePath</div><pre>$content</pre></div>"
}

$body = $blocks -join "`n"

$html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>BataMart Code</title><style>'
$html += 'body{margin:0;padding:20px;background:#1e1e1e;color:#d4d4d4;font-family:monospace;font-size:13px;line-height:1.6;}'
$html += '.file-block{margin-bottom:48px;}'
$html += '.file-header{background:#333;color:#9cdcfe;padding:8px 14px;font-weight:bold;font-size:13px;border-left:4px solid #569cd6;margin-bottom:0;}'
$html += 'pre{margin:0;padding:16px;background:#252526;overflow-x:auto;white-space:pre-wrap;word-break:break-word;border:1px solid #333;}'
$html += '</style></head><body>'
$html += $body
$html += '</body></html>'

[System.IO.File]::WriteAllText($outputFile, $html, [System.Text.Encoding]::UTF8)

Write-Host "Done! -> $outputFile" -ForegroundColor Green
Write-Host "$($allFiles.Count) files. Open in Chrome and just scroll." -ForegroundColor Cyan