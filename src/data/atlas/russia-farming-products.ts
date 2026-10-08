import statistics from '../../../public/assets/atlas/europe/farming-statistics-v1/statistics.json';

// Classroom candidates, not an official cross-product ranking. A crop's
// harvested tonnes and a livestock stock count cannot be ranked together.
const candidates = [
  {id:'wheat-production',label:'小麦',group:'crop'},
  {id:'sugarbeet-production',label:'テンサイ',group:'crop'},
  {id:'barley-production',label:'大麦',group:'crop'},
  {id:'potato-production',label:'ジャガイモ',group:'crop'},
  {id:'sunflower-production',label:'ヒマワリ種子',group:'crop'},
  {id:'maize-production',label:'トウモロコシ',group:'crop'},
  {id:'cattle-stocks',label:'牛',group:'livestock'},
  {id:'pig-stocks',label:'豚',group:'livestock'},
  {id:'sheep-stocks',label:'羊',group:'livestock'},
  {id:'chicken-stocks',label:'鶏',group:'livestock'},
] as const;
type Observation = (string | number)[];

export const russiaFarmingProductCandidates = candidates.map(candidate => {
  const row = (statistics.countries.RUS.observations as Observation[]).find(
    item => item[0] === candidate.id && item[1] === 2022 && item[4] === 'A',
  );
  if (!row) throw new Error(`FAOSTAT 2022 official row unavailable for ${candidate.id}`);
  const value = Number(row[2]);
  if (!Number.isFinite(value) || value < 0) throw new Error(`FAOSTAT row invalid for ${candidate.id}`);
  return {...candidate, value, unit: String(row[3]), year: 2022};
});
