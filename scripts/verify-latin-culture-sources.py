"""Read original public PDFs over normal HTTPS and save review-only evidence.
No source graphic is distributed by the site. Nothing changes network security.
"""
import base64, concurrent.futures, hashlib, json, os, pathlib, re, subprocess, urllib.request
root = pathlib.Path(os.environ.get('LATIN_CULTURE_SOURCE_OUTPUT', '/tmp/latin-culture-sources'))
root.mkdir(parents=True, exist_ok=True)
sources = json.loads(pathlib.Path('data-source/atlas/latin-reading/geographic-source-review.json').read_text())['sources']
def fetch(source):
    item = dict(source)
    try:
        with urllib.request.urlopen(source['url'], timeout=50) as response:
            content = response.read()
        assert content.startswith(b'%PDF'), 'Response is not a PDF'
        document = root / (source['id'] + '.pdf')
        document.write_bytes(content)
        item.update(bytes=len(content), sha256=hashlib.sha256(content).hexdigest())
        text_path = document.with_suffix('.txt')
        subprocess.run(['pdftotext', '-layout', str(document), str(text_path)], check=True)
        pages = text_path.read_text().split('\f')
        if source['id'] == 'peru-profile':
            selected = [i + 1 for i, page in enumerate(pages) if re.search(r'CUADRO\s+N[^\d\n]{0,5}2\.(22|71)\b', page, re.I) or ('Mestizo' in page and 'San Martín' in page and 'Cajamarca' in page)]
            item['pages'] = selected
            for number in selected:
                print('LATIN_SOURCE_TEXT ' + json.dumps({'id': source['id'], 'page': number, 'text': pages[number - 1]}, ensure_ascii=False))
        item['previews'] = []
        for number in item['pages']:
            prefix = root / (source['id'] + '-' + str(number))
            subprocess.run(['pdftoppm', '-f', str(number), '-l', str(number), '-singlefile', '-scale-to', '1800', '-png', str(document), str(prefix)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            image = prefix.with_suffix('.png').read_bytes()
            encoded = base64.b64encode(image).decode()
            digest = hashlib.sha256(image).hexdigest()
            item['previews'].append({'file': prefix.name + '.png', 'sha256': digest})
            print('LATIN_SOURCE_VISUAL ' + prefix.name + '.png ' + str((len(encoded) + 8191) // 8192) + ' ' + digest)
            for i in range((len(encoded) + 8191) // 8192):
                print('LATIN_SOURCE_VISUAL_PART ' + prefix.name + '.png ' + str(i) + ' ' + encoded[i * 8192:(i + 1) * 8192])
        item['status'] = 'readable'
    except Exception as error:
        item.update(status='unavailable', error=str(error))
    return item
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(fetch, sources))
report = {'sources': results, 'purpose': 'Original-source verification; not a site asset or publication approval'}
(root / 'source-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('LATIN_SOURCE_REPORT ' + json.dumps(report, ensure_ascii=False))
