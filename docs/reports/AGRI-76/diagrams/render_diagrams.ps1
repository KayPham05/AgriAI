param(
    [Parameter(Mandatory = $true)]
    [string]$JarPath
)

$ErrorActionPreference = 'Stop'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$resolvedJar = (Resolve-Path -LiteralPath $JarPath).Path
$sources = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.puml' | Sort-Object Name
& java '-Djava.awt.headless=true' -jar $resolvedJar -charset UTF-8 -failfast2 -tsvg @($sources.FullName)
if ($LASTEXITCODE -ne 0) { throw 'PlantUML render failed.' }

$figures = foreach ($source in $sources) {
    $slug = $source.BaseName
    $svgPath = Join-Path $PSScriptRoot ($slug + '.svg')
    [xml]$document = [System.IO.File]::ReadAllText($svgPath)
    $svg = $document.DocumentElement
    $namespace = $svg.NamespaceURI
    $title = $svg.SelectSingleNode('*[local-name()="title"]')
    if ($null -eq $title) {
        $title = $document.CreateElement('title', $namespace)
        $title.InnerText = $slug
        [void]$svg.PrependChild($title)
    }
    $title.SetAttribute('id', $slug + '-title')
    [void]$svg.PrependChild($title)
    $description = $document.CreateElement('desc', $namespace)
    $description.SetAttribute('id', $slug + '-desc')
    $description.InnerText = 'AgriVision working tree sau AGRI-70, đối chiếu 2026-10-07; xem README và traceability.'
    if ($slug -eq 'erd') { $description.InnerText = 'ERD baseline 6 bảng ngày 2026-10-05; xem erd_current cho schema sau migration.' }
    if ($slug.StartsWith('target_')) {
        $description.InnerText = 'Quy trình mục tiêu cốt lõi đề xuất 2026-10-06; các bước Planned chưa được nghiệm thu, xem core_target_workflows.md.'
    }
    [void]$svg.InsertAfter($description, $title)
    $svg.SetAttribute('role', 'img')
    $svg.SetAttribute('aria-labelledby', $slug + '-title ' + $slug + '-desc')

    if ($slug.StartsWith('dfd_')) {
        # Yourdon data stores use two parallel lines; PlantUML rectangles are layout anchors.
        $stores = $svg.SelectNodes('//*[local-name()="g" and starts-with(@data-entity,"D")]')
        foreach ($store in $stores) {
            $rectangle = $store.SelectSingleNode('*[local-name()="rect"]')
            if ($null -eq $rectangle) { throw "Missing datastore shape in $slug" }
            $x = [double]::Parse($rectangle.GetAttribute('x'), [cultureinfo]::InvariantCulture)
            $y = [double]::Parse($rectangle.GetAttribute('y'), [cultureinfo]::InvariantCulture)
            $width = [double]::Parse($rectangle.GetAttribute('width'), [cultureinfo]::InvariantCulture)
            $height = [double]::Parse($rectangle.GetAttribute('height'), [cultureinfo]::InvariantCulture)
            $rectangle.SetAttribute('style', 'stroke:none;')
            $rectangle.RemoveAttribute('rx')
            $rectangle.RemoveAttribute('ry')
            $path = $document.CreateElement('path', $namespace)
            $path.SetAttribute('d', [string]::Format([cultureinfo]::InvariantCulture, 'M {0} {1} h {2} M {0} {3} h {2}', $x, $y, $width, ($y + $height)))
            $path.SetAttribute('style', 'fill:none;stroke:#2d3142;stroke-width:1;')
            [void]$store.InsertAfter($path, $rectangle)
            foreach ($label in @($store.SelectNodes('*[local-name()="text"]'))) {
                if ($label.InnerText -eq '«datastore»') { [void]$store.RemoveChild($label) }
            }
        }
        foreach ($rectangle in $svg.SelectNodes('//*[local-name()="g" and @class="entity"]/*[local-name()="rect"]')) {
            $rectangle.RemoveAttribute('rx')
            $rectangle.RemoveAttribute('ry')
        }
    }

    # Inline gallery figures must not share PlantUML-generated IDs.
    foreach ($element in $svg.SelectNodes('//*[@id]')) {
        $identifier = $element.GetAttribute('id')
        if (-not $identifier.StartsWith($slug + '-')) { $element.SetAttribute('id', $slug + '-' + $identifier) }
    }
    $markup = $svg.OuterXml
    [System.IO.File]::WriteAllText($svgPath, $markup + "`n", $utf8)
    $safeTitle = [System.Net.WebUtility]::HtmlEncode($title.InnerText)
    $viewWidth = $svg.GetAttribute('viewBox').Split(' ')[2]
    "<section id='$slug'><h2>$safeTitle</h2><p><a href='$slug.puml'>Source PlantUML</a> · <a href='$slug.svg'>SVG editable</a> · <a href='README.md#$slug'>Giải thích và nguồn</a></p><div class='canvas'><div style='min-width:${viewWidth}px'>$markup</div></div></section>"
}

$navigation = ($sources | ForEach-Object { "<a href='#$($_.BaseName)'>$($_.BaseName)</a>" }) -join ' '
$html = @"
<!doctype html>
<html lang='vi'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>
<title>AgriVision — sơ đồ hiện trạng và mục tiêu</title>
<link href='https://fonts.googleapis.com/css2?family=Instrument+Serif&amp;family=Geist:wght@400;600&amp;family=Geist+Mono&amp;display=swap' rel='stylesheet'>
<style>
:root{color-scheme:light}body{margin:0;background:#f5f5f5;color:#2d3142;font-family:Geist,Arial,sans-serif}main{max-width:1400px;margin:auto;padding:32px}h1{font:400 42px 'Instrument Serif',Georgia,serif}h2{font-size:20px}p{line-height:1.7}a{color:#2e5aa8}nav{display:flex;flex-wrap:wrap;gap:12px;font:12px 'Geist Mono',monospace}section{margin-top:40px;padding-top:16px;border-top:1px solid #bfc0c0}.canvas{overflow-x:auto;border:1px solid #bfc0c0;padding:16px;background:#f5f5f5}svg{display:block}code{font-family:'Geist Mono',monospace}@media print{main{padding:0}nav{display:none}section{break-before:page}.canvas{overflow:visible}svg{width:100%!important;height:auto!important}.canvas>div{min-width:0!important}}
</style></head><body><main>
<h1>AgriVision AI — hiện trạng và mục tiêu</h1>
<p>Working tree sau AGRI-70 · đối chiếu source/schema 2026-10-07. <code>erd</code> giữ baseline 6 bảng; <code>erd_current</code> là 9 bảng hiện tại. Đọc <a href='../system_analysis.md'>phân tích hệ thống</a>, <a href='../use_case_specifications.md'>Use Case Specification</a> và <a href='../traceability.md'>truy vết</a>. FastAPI inference chưa có implementation server trong checkout; health không chứng minh model inference.</p>
<p><code>state_prediction_ui</code> mô tả PredictionStatus của UI hiện tại; DB Prediction chưa có status. DFD dùng bubble process, external rectangle và data store hai đường song song. SVG và source đều editable. Font sơ đồ dùng Arial để render offline; tiêu đề trang dùng Instrument Serif, fallback Georgia; nội dung trang Geist, fallback Arial.</p>
<p>Các sơ đồ <code>target_*</code> là quy trình mục tiêu cốt lõi theo yêu cầu 2026-10-06, chưa phải implementation hoặc kết quả nghiệm thu. State mục tiêu là trạng thái xử lý đề xuất, không phải status DB. Xem <a href='../core_target_workflows.md'>phạm vi, mapping và các bước Planned</a>.</p>
<nav aria-label='Danh sách sơ đồ'>$navigation</nav>
$($figures -join "`n")
</main></body></html>
"@
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'index.html'), $html, $utf8)
Write-Output "Rendered $($sources.Count) PlantUML sources, SVGs and standalone gallery."
