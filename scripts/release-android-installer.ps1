param(
  [Parameter(Mandatory = $true)]
  [string]$ApkPath,

  [string]$Version = "",
  [string]$BuildNumber = "",
  [string]$ReleaseDate = (Get-Date -Format "yyyy-MM-dd")
)

$resolvedApkPath = Resolve-Path -LiteralPath $ApkPath -ErrorAction Stop
$apkItem = Get-Item -LiteralPath $resolvedApkPath
$checksum = Get-FileHash -LiteralPath $resolvedApkPath -Algorithm SHA256

[PSCustomObject]@{
  platform = "android"
  version = $Version
  buildNumber = $BuildNumber
  fileName = $apkItem.Name
  fileSizeBytes = $apkItem.Length
  sha256 = $checksum.Hash.ToLowerInvariant()
  releaseDate = $ReleaseDate
  minimumVersion = "Android 8.0 or newer"
} | ConvertTo-Json -Depth 3
