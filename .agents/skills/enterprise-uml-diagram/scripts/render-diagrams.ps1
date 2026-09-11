[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [ValidateSet('Svg', 'Png', 'Both')]
    [string]$Format = 'Svg',

    [string]$PlantUmlJar,

    [ValidateRange(300, 2400)]
    [int]$PngDpi = 300,

    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$resolvedInput = Resolve-Path -LiteralPath $InputPath
$inputItem = Get-Item -LiteralPath $resolvedInput
$diagramFiles = if ($inputItem.PSIsContainer) {
    @(Get-ChildItem -LiteralPath $resolvedInput -Filter '*.puml' -File)
} else {
    @($inputItem)
}

if ($diagramFiles.Count -eq 0) {
    throw "No .puml files found at: $resolvedInput"
}

$plantUmlCommand = Get-Command plantuml -ErrorAction SilentlyContinue
$javaCommand = Get-Command java -ErrorAction SilentlyContinue

if (-not $plantUmlCommand -and -not $PlantUmlJar) {
    throw 'PlantUML is unavailable. Install the PlantUML CLI or pass -PlantUmlJar <path>. No files were rendered.'
}

if ($PlantUmlJar) {
    $resolvedJar = Resolve-Path -LiteralPath $PlantUmlJar
    if (-not $javaCommand) {
        throw 'Java is required when using -PlantUmlJar.'
    }
}

function Invoke-PlantUml {
    param([string[]]$Arguments)

    if ($plantUmlCommand) {
        & $plantUmlCommand.Source @Arguments
    } else {
        & $javaCommand.Source '-DPLANTUML_LIMIT_SIZE=16384' '-jar' $resolvedJar @Arguments
    }

    if ($LASTEXITCODE -ne 0) {
        throw "PlantUML failed with exit code $LASTEXITCODE."
    }
}

function Set-And-Test-PngDpi {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [int]$Dpi
    )

    Add-Type -AssemblyName System.Drawing
    $resolvedPng = Resolve-Path -LiteralPath $Path
    $temporaryPng = Join-Path ([System.IO.Path]::GetDirectoryName($resolvedPng)) `
        (([System.IO.Path]::GetFileNameWithoutExtension($resolvedPng)) + '.dpi.tmp.png')
    $sourceImage = [System.Drawing.Image]::FromFile($resolvedPng)
    try {
        $bitmap = New-Object System.Drawing.Bitmap($sourceImage)
        try {
            # PNG stores resolution as an integer number of pixels per meter.
            # Add a small margin so conversion cannot round below the requested minimum DPI.
            $encodedDpi = [single]($Dpi + 0.1)
            $bitmap.SetResolution($encodedDpi, $encodedDpi)
            $bitmap.Save($temporaryPng, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $bitmap.Dispose()
        }
    } finally {
        $sourceImage.Dispose()
    }
    Move-Item -LiteralPath $temporaryPng -Destination $resolvedPng -Force

    $verifiedImage = [System.Drawing.Image]::FromFile($resolvedPng)
    try {
        if ($verifiedImage.HorizontalResolution -lt $Dpi -or $verifiedImage.VerticalResolution -lt $Dpi) {
            throw "PNG DPI verification failed for $resolvedPng. Expected at least $Dpi DPI but found $($verifiedImage.HorizontalResolution) x $($verifiedImage.VerticalResolution)."
        }
    } finally {
        $verifiedImage.Dispose()
    }
}

$paths = @($diagramFiles | ForEach-Object { $_.FullName })
Invoke-PlantUml -Arguments (@('-charset', 'UTF-8', '-checkonly') + $paths)

if ($ValidateOnly) {
    Write-Output "Validated $($diagramFiles.Count) PlantUML file(s). No images were rendered."
    return
}

$formats = switch ($Format) {
    'Svg' { @('svg') }
    'Png' { @('png') }
    'Both' { @('svg', 'png') }
}

foreach ($outputFormat in $formats) {
    Invoke-PlantUml -Arguments (@('-charset', 'UTF-8', "-t$outputFormat") + $paths)
    if ($outputFormat -eq 'png') {
        foreach ($diagramFile in $diagramFiles) {
            $pngPath = [System.IO.Path]::ChangeExtension($diagramFile.FullName, '.png')
            Set-And-Test-PngDpi -Path $pngPath -Dpi $PngDpi
        }
    }
}

Write-Output "Validated $($diagramFiles.Count) PlantUML file(s). Rendered format: $Format.$(if ($Format -ne 'Svg') { " PNG metadata: $PngDpi DPI." })"
