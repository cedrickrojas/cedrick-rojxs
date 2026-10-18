# Rebuild the portfolio's typography-based sharing card on Windows:
# powershell -NoProfile -File scripts/generate_social_preview.ps1
# The generated PNG is committed; deployment needs no image tools or system fonts.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $projectRoot 'assets/social-preview.png'
$bitmap = [System.Drawing.Bitmap]::new(1200, 630)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$resources = [System.Collections.Generic.List[System.IDisposable]]::new()

function New-Brush([string]$hex) {
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
    $resources.Add($brush)
    return $brush
}

function New-Font([string]$family, [single]$size, [System.Drawing.FontStyle]$style = 'Regular') {
    $font = [System.Drawing.Font]::new($family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $resources.Add($font)
    return $font
}

function Draw-Text([string]$text, $font, $brush, [single]$x, [single]$y) {
    $graphics.DrawString($text, $font, $brush, [System.Drawing.PointF]::new($x, $y))
}

try {
    $graphics.SmoothingMode = 'AntiAlias'
    $graphics.TextRenderingHint = 'AntiAliasGridFit'
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0A0C0A'))

    $ink = New-Brush '#F3F0E7'
    $gold = New-Brush '#EBB13E'
    $sage = New-Brush '#84AE90'
    $muted = New-Brush '#A5AEA2'
    $surface = New-Brush '#101610'
    $gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(14, 132, 174, 144), 1)
    $linePen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#293329'), 1)
    $circuitPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#3D5543'), 2)
    $resources.Add($gridPen)
    $resources.Add($linePen)
    $resources.Add($circuitPen)

    for ($x = 0; $x -lt 1200; $x += 48) { $graphics.DrawLine($gridPen, $x, 0, $x, 630) }
    for ($y = 0; $y -lt 630; $y += 48) { $graphics.DrawLine($gridPen, 0, $y, 1200, $y) }
    $graphics.DrawRectangle($linePen, 32, 32, 1135, 565)
    $graphics.FillRectangle($gold, 72, 77, 32, 3)
    Draw-Text 'PORTFOLIO / CEDRICK ROJAS' (New-Font 'Consolas' 17) $sage 118 65

    Draw-Text 'Cedrick' (New-Font 'Segoe UI' 86 'Bold') $ink 64 134
    Draw-Text 'Rojas.' (New-Font 'Segoe UI' 86 'Bold') $gold 64 226
    Draw-Text 'Web Developer' (New-Font 'Segoe UI' 32 'Regular') $ink 72 351
    Draw-Text 'Full-stack web apps and IoT systems.' (New-Font 'Segoe UI' 22) $muted 73 405

    # A native monogram and telemetry lines echo the site's console styling.
    $graphics.DrawLine($circuitPen, 755, 210, 842, 210)
    $graphics.DrawLine($circuitPen, 755, 210, 755, 282)
    $graphics.DrawLine($circuitPen, 755, 282, 700, 282)
    $graphics.DrawLine($circuitPen, 1058, 330, 1110, 330)
    $graphics.DrawLine($circuitPen, 1110, 330, 1110, 402)
    $graphics.DrawLine($circuitPen, 1110, 402, 990, 402)
    $graphics.FillRectangle($surface, 825, 158, 238, 228)
    $graphics.DrawRectangle($linePen, 825, 158, 238, 228)
    $graphics.FillRectangle($gold, 825, 158, 46, 3)
    Draw-Text 'CR' (New-Font 'Segoe UI' 98 'Bold') $gold 848 190
    Draw-Text '< / >' (New-Font 'Consolas' 20) $sage 916 337
    $graphics.FillEllipse($sage, 694, 276, 12, 12)
    $graphics.FillEllipse($gold, 984, 396, 12, 12)

    $graphics.DrawLine($linePen, 72, 492, 1128, 492)
    Draw-Text 'cedrick-rojxs.vercel.app' (New-Font 'Consolas' 22) $ink 72 521
    Draw-Text 'WEB / IOT / DATA' (New-Font 'Consolas' 17) $sage 940 526

    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Created $outputPath (1200 x 630)."
} finally {
    foreach ($resource in $resources) { $resource.Dispose() }
    $graphics.Dispose()
    $bitmap.Dispose()
}
