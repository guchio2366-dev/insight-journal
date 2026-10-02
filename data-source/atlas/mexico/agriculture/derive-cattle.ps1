$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$atlasRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$archiveRelative='data-source/atlas/mexico/agriculture/raw/ca_2022_upagro_csv.zip'
$archivePath=Join-Path $atlasRoot $archiveRelative
$entryName='conjunto_datos/ca2022_gan02.csv'
$archive=[IO.Compression.ZipFile]::OpenRead($archivePath)
try { $stream=$archive.GetEntry($entryName).Open();$buffer=[IO.MemoryStream]::new();$stream.CopyTo($buffer);$stream.Dispose();$entryBytes=$buffer.ToArray();$buffer.Dispose() } finally {$archive.Dispose()}
$rows=@([Text.Encoding]::UTF8.GetString($entryBytes) | ConvertFrom-Csv | Where-Object {$_.CVE_MUN.Trim() -eq '000' -and $_.TIPO_UNIDAD.Trim() -eq ''})
if($rows.Count -ne 33){throw 'Expected national plus 32 state totals'}
$values=[ordered]@{}
foreach($row in $rows){if($row.BOV_EX_TOT -notmatch '^\d+$'){throw 'Missing or suppressed cattle total'};$values[$row.CVE_ENT.Trim()]=[int64]$row.BOV_EX_TOT}
$states=[ordered]@{};1..32 | ForEach-Object {$code='{0:00}' -f $_;if(!$values.Contains($code)){throw 'State missing'};$states[$code]=$values[$code]}
$total=($states.Values | Measure-Object -Sum).Sum
if($total -ne $values['00'] -or $total -ne 24808075){throw 'National reconciliation failed'}
$sha=[Security.Cryptography.SHA256]::Create()
$entryHash=[Convert]::ToHexString($sha.ComputeHash($entryBytes)).ToLowerInvariant();$sha.Dispose()
$data=[ordered]@{version=1;indicator='cattleHeads';unit='頭';period='2022年9月';scope='農業生産単位と家畜を飼養する住宅の牛の飼養頭数。肉・乳の生産量や飼養域の面積ではありません。';national=$values['00'];states=$states;provenance=[ordered]@{archive=$archiveRelative;archiveSha256=(Get-FileHash $archivePath -Algorithm SHA256).Hash.ToLowerInvariant();entry=$entryName;entrySha256=$entryHash;field='BOV_EX_TOT';filter="CVE_MUN.trim() == '000' and TIPO_UNIDAD.trim() == ''";sourceUrl='https://www.inegi.org.mx/contenidos/programas/ca/2022/datosabiertos/ca_2022_upagro_csv.zip';definitionUrl='https://www.inegi.org.mx/contenidos/programas/ca/2022/doc/ca2022_rdnal.pdf';periodUnitUrl='https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2025/EAP_Ganaderia.pdf';licenceUrl='https://www.inegi.org.mx/inegi/terminos.html'};quality=[ordered]@{states=32;missing=0;suppressed=0;stateSum=$total;difference=0}}
[IO.File]::WriteAllText((Join-Path $atlasRoot 'src/data/atlas/mexico/livestock.json'),($data | ConvertTo-Json -Depth 8)+"`n",[Text.UTF8Encoding]::new($false))
Write-Output "32 states; cattle national $total; difference 0"
