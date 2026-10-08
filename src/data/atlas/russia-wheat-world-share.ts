import statistics from '../../../public/assets/atlas/europe/farming-statistics-v1/statistics.json';

// Keep the national chart separate from the 2020 spatial model on the map.
// FAOSTAT's later Russian wheat rows carry X (unofficial), so the chart uses
// only paired official Russian and World observations from 2020–2022.
const officialYears = [2020, 2021, 2022];
type Observation = (string | number)[];

export const russiaWheatWorldShare = officialYears.map(year => {
  const russian = (statistics.countries.RUS.observations as Observation[]).find(
    row => row[0] === 'wheat-production' && row[1] === year && row[3] === 't' && row[4] === 'A',
  );
  const world = (statistics.world.observations as Observation[]).find(
    row => row[0] === 'wheat-production' && row[1] === year && row[3] === 't' && row[4] === 'A',
  );
  if (!russian || !world) throw new Error(`FAOSTAT official wheat pair unavailable for ${year}`);
  const russianTonnes = Number(russian[2]);
  const worldTonnes = Number(world[2]);
  if (!Number.isFinite(russianTonnes) || !Number.isFinite(worldTonnes) || worldTonnes <= 0) {
    throw new Error(`FAOSTAT wheat values invalid for ${year}`);
  }
  return {year, russianTonnes, worldTonnes, share: russianTonnes / worldTonnes * 100};
});
