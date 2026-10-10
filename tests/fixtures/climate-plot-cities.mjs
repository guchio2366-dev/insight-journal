import {readFileSync} from 'node:fs';
import {asiaClimateCities} from '../../src/data/atlas/asia-climate-cities.ts';
import {africaClimateCities} from '../../src/data/atlas/africa-climate-cities.ts';
import {latinClimateCities} from '../../src/data/atlas/latin-america-climate.ts';
const json = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
export const climatePlotCities = {
 us: json('public/assets/atlas/nature-v1/climate-cities.json'),
 canada: json('src/data/atlas/canada/climate.json').stations,
 mexico: json('src/data/atlas/mexico/climate-normals.json').stations,
 europe: json('src/data/atlas/europe/climate-cities.json').map(c => ({...c, temperatureC: c.months.map(m => m.temperature), precipitationMm: c.months.map(m => m.precipitation)})),
 asia: asiaClimateCities,
 westAsia: json('src/data/atlas/west-asia.json').cities,
 africa: africaClimateCities,
 latinLegacy: latinClimateCities,
 latinNature: json('src/data/atlas/latin-america/nature.json').cities,
};
