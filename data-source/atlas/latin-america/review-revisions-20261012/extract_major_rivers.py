"""Reuse pinned NE10m originals while retaining independent geographic features.

Cartographic scale ranks select display detail. They do not establish river flow,
mainstem status, connected basin membership, discharge or drainage polygons.
"""
import argparse
import hashlib
import json
from pathlib import Path


def points(values):
    if not values:
        return
    if isinstance(values[0], (int, float)):
        yield values
    else:
        for child in values:
            yield from points(child)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(source, output):
    expected = 'bb854a900ecbd3b408df46d5e16e3e0f974ba55993f9d8b5c26e855273c0905a'
    assert sha(source) == expected
    original = json.loads(source.read_text())
    features = []
    all_count = 0
    # These documented named tributaries remain useful at the overview scale.
    # The source shapes are not stitched, routed, relabelled or repositioned.
    amazon_tributaries = {'Negro', 'Madeira', 'Tapajós', 'Xingu'}
    for index, feature in enumerate(original['features']):
        properties = feature['properties']
        name = properties.get('name')
        if not name:
            continue
        coordinates = list(points(feature['geometry']['coordinates']))
        if not coordinates:
            continue
        bounds = [min(p[0] for p in coordinates), min(p[1] for p in coordinates), max(p[0] for p in coordinates), max(p[1] for p in coordinates)]
        if not any(-93 <= p[0] <= -33 and -56 <= p[1] <= 28 for p in coordinates):
            continue
        all_count += 1
        rank = properties.get('scalerank')
        if name == 'Negro':
            region = 'amazon' if bounds[1] > -10 else 'argentina-patagonia' if bounds[1] < -37 else 'uruguay'
        else:
            region = 'central-caribbean' if bounds[1] >= 6 else 'south-america'
        documented_amazon = name in amazon_tributaries and (name != 'Negro' or region == 'amazon')
        # Keep all named rank<=6 features and their source lake sections. Preserve
        # all three Negro rivers even when the Uruguay rank is 7.
        if not (rank <= 6 or name == 'Negro' or name in {'Caroní', 'Apure', 'Cauca'}):
            continue
        river_number = properties.get('rivernum')
        feature_class = properties.get('featurecla')
        slug = 'lake' if feature_class == 'Lake Centerline' else 'river'
        feature_id = f'ne10m-{river_number}-{slug}-{index}'
        features.append({
            **feature,
            'id': feature_id,
            'properties': {
                **properties,
                'atlasId': feature_id,
                'sourceFeatureIndex': index,
                'sourceBBox': bounds,
                'geographicRegion': region,
                'distinctName': f'Negro ({region})' if name == 'Negro' else name,
                'defaultVisible': rank <= 4 or documented_amazon,
                'regionalDetailVisible': True,
                'cartographicRankMeaning': 'Natural Earth display rank, not hydrological order or flow',
                'relationEvidence': 'documented-named-amazon-tributary' if documented_amazon else 'not-routing-certified',
            },
        })
        assert features[-1]['geometry'] == original['features'][index]['geometry']
    output.mkdir(parents=True, exist_ok=True)
    path = output / 'major-rivers.geojson'
    path.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, separators=(',', ':')) + '\n')
    negro = [{'id': f['id'], 'region': f['properties']['geographicRegion'], 'class': f['properties']['featurecla'], 'bounds': f['properties']['sourceBBox']} for f in features if f['properties']['name'] == 'Negro']
    assert {f['region'] for f in negro} == {'amazon', 'argentina-patagonia', 'uruguay'}
    meta = {
        'dataset': 'Natural Earth 1:10m rivers and lake centerlines',
        'sourceUrl': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson',
        'license': 'Public domain',
        'sourceCRS': 'EPSG:4326',
        'sourceSHA256': expected,
        'sourceAcquisition': 'Reused retained original, SHA verified, no network request',
        'sourceResolution': 'Cartographic scale 1:10,000,000',
        'yearMeaning': 'Natural Earth original file pinned by SHA, not an annual hydrological observation',
        'candidateBounds': [-93, -56, -33, 28],
        'scopeNote': 'Candidate source geometries include portions outside target countries, including Mexico; renderer must use the existing Latin34-country land clip. Whole source geographic features are retained unchanged.',
        'selection': 'Named source features with scalerank <=6; all Negro features and named Caroni, Apure and Cauca also retained; overview defaults rank<=4 plus documented named Amazon tributaries. Display ranks are not hydrological order.',
        'noDissolveByName': True,
        'sameNameSeparated': negro,
        'originalNamedFeatureCountInBounds': all_count,
        'retainedFeatureCount': len(features),
        'overviewDefaultFeatureCount': sum(f['properties']['defaultVisible'] for f in features),
        'file': {'name': path.name, 'bytes': path.stat().st_size, 'sha256': sha(path)},
        'scriptSHA256': sha(Path(__file__)),
        'validation': {'allCoordinatesUnchanged': True, 'allIDsUnique': len({f['id'] for f in features}) == len(features), 'negroThreeGeographicSystemsSeparated': True, 'flowDirectionGenerated': False, 'connectingSegmentsAdded': False, 'basinPolygonsGenerated': False},
        'relationshipSources': [
            {'url': 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6813176/', 'citation': 'Beltrao, Zuanon & Ferreira (2019), ZooKeys 881:53-89, doi:10.3897/zookeys.881.32055', 'license': 'CC BY 4.0', 'use': 'Negro drains into the Amazonas/Solimoes; Branco is a Negro tributary. Documentary named relation only; no routing vertices or basin polygons extracted.'},
            {'url': 'https://agris.fao.org/search/en/providers/122535/records/65dff92d4c5aef494fe73a10', 'citation': 'Sawakuchi et al. (2014), Methane emissions from Amazonian Rivers and their contribution to the global methane budget', 'use': 'Primary study abstract names Negro, Madeira, Tapajos and Xingu as Amazon tributaries; no numeric flux or new geographic coordinates adopted.'},
        ],
        'missing': 'Full routing topology, scientifically defined mainstem and authenticated basin boundaries remain unacquired. Tocantins is not assigned to Amazon. Same-name separation is geographic identity disambiguation, not inferred routing.'
    }
    (output / 'major-rivers.source.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'file': meta['file'], 'features': len(features), 'overview': meta['overviewDefaultFeatureCount'], 'Negro': negro}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.source, args.output)
