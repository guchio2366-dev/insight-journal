/** Linear, city-local axes; null is missing, never zero. */
export function climateAxes(temperatureC: (number | null)[], precipitationMm: (number | null)[]) {
  if (temperatureC.length !== 12 || precipitationMm.length !== 12) throw new Error('Climate plots require 12 months');
  const valid = (values: (number | null)[]) => values.filter((v): v is number => v !== null);
  const temperature = valid(temperatureC), rain = valid(precipitationMm);
  if ([...temperature, ...rain].some(v => !Number.isFinite(v)) || rain.some(v => v < 0)) throw new Error('Invalid climate plot value');
  const temperatureMin = Math.min(-3, Math.floor(Math.min(-3, ...temperature) / 10) * 10);
  // Keep ordinary cities at −3 rather than rounding that default down to −10.
  const min = temperature.every(v => v >= -3) ? -3 : temperatureMin;
  const max = Math.max(40, Math.ceil(Math.max(40, ...temperature) / 10) * 10);
  const peakRain = Math.max(0, ...rain);
  const rainMax = Math.max(350, Math.ceil(peakRain / 50) * 50);
  const rainTicks = Array.from({length: Math.floor(rainMax / 100) + 1}, (_, i) => i * 100);
  const temperatureTicks = Array.from({length: (max - Math.ceil(min / 10) * 10) / 10 + 1}, (_, i) => Math.ceil(min / 10) * 10 + i * 10);
  const peakMonths = precipitationMm.flatMap((v, i) => v === peakRain ? [i + 1] : []);
  const peakLabel = peakRain > 350 ? `最多雨：${peakMonths.join('・')}月 ${peakRain.toLocaleString('ja-JP', {maximumFractionDigits: 1})} mm` : '';
  return {temperatureMin: min, temperatureMax: max, temperatureTicks, rainMax, rainTicks, peakRain, peakMonths, peakLabel};
}

export const climateAxisNote = '気温は基本−3〜40℃、降水量は基本0〜350mm。実値が超える都市だけ範囲を広げます。補助線は10℃・100mm間隔で、気温は右軸、降水量は左軸を読みます。';
