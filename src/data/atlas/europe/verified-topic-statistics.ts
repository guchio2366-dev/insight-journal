/** Only figures whose commodity matches the selected map subject are shown.
 * Livestock location maps describe animals, not meat or milk production. */
export const europeVerifiedTopicMatches:Record<string,{productionId?:string;tradeId?:string}>={
  wheat:{productionId:'wheat',tradeId:'wheat_export'},
  potato:{productionId:'potatoes'},
  maize:{productionId:'maize'},
  soybean:{tradeId:'soy_import'},
};
