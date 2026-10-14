/** Verified public corporate article, 2026-03. Its 32-hex publication ID is
 * public and unrelated to private workspace IDs. Match the complete URL only. */
export const eastCoalPrimaryUrl='https://www.ceic.com/gjnyjtwwEn/xwzx/202603/afde763e8fe74258a0fb759ceecbbc21.shtml';
export function eastPublicSourceScanText(text:string){return text.replaceAll(eastCoalPrimaryUrl,'[public CHN Energy article]');}
