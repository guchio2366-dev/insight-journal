/** Read the additive data-preparation package without changing restored UI state.
 * This applies only to these new evidence assets, never to existing f548290 layers.
 */
export function preparedMexicoBasinPlan(catalog, systemId) {
  if (catalog?.schemaVersion !== 1 || catalog.isCompleteNationalBasinInventory !== false || catalog.totalDomesticSourceBasins !== 158) {
    throw new Error('Expected representative-system evidence, not a national three-basin inventory');
  }
  const system = catalog.systems?.find(item => item.id === systemId);
  if (!system) throw new Error('Unknown representative system');
  if (system.allowMainstemFlowMouthRendering !== false) {
    throw new Error('This preparation package has no verified named-network topology');
  }
  for (const key of ['verifiedMainstem', 'verifiedFlowArrows', 'verifiedMouths']) {
    if (system[key]?.type !== 'FeatureCollection' || !Array.isArray(system[key].features) || system[key].features.length) {
      throw new Error('Unverified endpoints or coordinate order cannot become flow or mouth markers');
    }
  }
  return {
    id: system.id,
    label: system.nameJa,
    basinSourceIds: [...system.basinSourceIds],
    basinGeojson: system.basinGeojson,
    domesticFill: {...system.domesticFill},
    countryClip: {...catalog.countryClip},
    frame: {...catalog.frame, placement: {...catalog.frame.placement}},
    scopeNote: system.foreignScopeJa,
    nationalScopeNote: catalog.nationalScopeLabelJa,
    groupingStatus: system.groupingStatus,
    preparedMainstem: [],
    preparedFlowArrows: [],
    preparedMouths: [],
    needsNamedNetworkEvidence: true,
  };
}
