$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root "dist\extension"
$resolvedRoot = (Resolve-Path -LiteralPath $root).Path

if (Test-Path -LiteralPath $dist) {
    $resolvedDist = (Resolve-Path -LiteralPath $dist).Path
    if (-not $resolvedDist.StartsWith($resolvedRoot)) {
        throw "拒绝清理工作区之外的目录: $resolvedDist"
    }
    Remove-Item -LiteralPath $resolvedDist -Recurse -Force
}

New-Item -ItemType Directory -Path $dist | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dist "images") | Out-Null

$files = @(
    "manifest.json",
    "background.js",
    "content.js",
    "options.html",
    "options.js"
)

foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $dist $file)
}

Copy-Item -LiteralPath (Join-Path $root "images\icon16.png") -Destination (Join-Path $dist "images\icon16.png")
Copy-Item -LiteralPath (Join-Path $root "images\icon32.png") -Destination (Join-Path $dist "images\icon32.png")
Copy-Item -LiteralPath (Join-Path $root "images\icon48.png") -Destination (Join-Path $dist "images\icon48.png")
Copy-Item -LiteralPath (Join-Path $root "images\icon128.png") -Destination (Join-Path $dist "images\icon128.png")

Write-Host "扩展目录已生成: $dist"
Write-Host "请在 chrome://extensions/ 中加载这个目录，而不是项目根目录。"
