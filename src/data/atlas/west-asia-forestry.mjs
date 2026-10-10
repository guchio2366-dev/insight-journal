// FAOSTAT Forestry item 1872 (sawnwood). Keep the three flows distinct: stock
// changes and re-exports prevent production + imports - exports from being used
// as measured domestic consumption.
const elements = {production:'5516',imports:'5616',exports:'5916'};

export function westSawnwoodRow(data, code, year){
  const observations = data.agriculture.countries[code]?.observations ?? [];
  const flow = elementCode => {
    const row = observations.find(item => item.domain === 'Forestry' && item.item === '1872' && item.elementCode === elementCode && item.year === year);
    return row && row.unit === 'm3' && Number.isFinite(row.value) ? {value:row.value, flag:row.flag} : null;
  };
  return {code, year, production:flow(elements.production), imports:flow(elements.imports), exports:flow(elements.exports)};
}

export function westSawnwoodSeries(data, code, start=2015, end=2024){
  return Array.from({length:end-start+1}, (_, index) => westSawnwoodRow(data, code, start+index));
}
