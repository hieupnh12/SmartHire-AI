[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [ValidateSet('Svg', 'Png', 'Both')]
    [string]$Format = 'Svg',

    [string]$PlantUmlJar
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

$paths = @($diagramFiles | ForEach-Object { $_.FullName })
Invoke-PlantUml -Arguments (@('-charset', 'UTF-8', '-checkonly') + $paths)

$formats = switch ($Format) {
    'Svg' { @('svg') }
    'Png' { @('png') }
    'Both' { @('svg', 'png') }
}

foreach ($outputFormat in $formats) {
    Invoke-PlantUml -Arguments (@('-charset', 'UTF-8', "-t$outputFormat") + $paths)
}

Write-Output "Validated $($diagramFiles.Count) PlantUML file(s). Rendered format: $Format."
