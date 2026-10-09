/** European excerpt of Pew Research Center's 2020 country estimates, appendix B.
 * Seven published broad religious identity groups. Percentages are rounded;
 * "<0.1" is preserved as a bound, never converted to zero. This excerpt
 * excludes the rest of the 201-country table and cannot describe sects or
 * within-country religious geography.
 * Source: https://www.pewresearch.org/wp-content/uploads/sites/20/2025/06/PR_2025.06.09_global-religious-change_appendix-b.pdf
 * Terms: https://www.pewresearch.org/about/terms-and-conditions/
 * Citation: Hackett et al. (2025), Religious Composition by Country, 2010–2020,
 * Pew Research Center, https://www.pewresearch.org/religion/feature/religious-composition-by-country-2010-2020/
 */
export const pew2020EuropeGroups=[
  {id:'christian',label:'キリスト教',color:'#516f90'},
  {id:'muslim',label:'イスラム教',color:'#5b8d78'},
  {id:'unaffiliated',label:'宗教的無所属',color:'#9b7696'},
  {id:'buddhist',label:'仏教',color:'#ad9a71'},
  {id:'hindu',label:'ヒンドゥー教',color:'#bb865f'},
  {id:'jewish',label:'ユダヤ教',color:'#8b83aa'},
  {id:'other',label:'その他の宗教',color:'#899590'},
] as const;
export const pew2020EuropeRows=[
  {code:'ALB',shares:['17.8','74.5','7.7','<0.1','<0.1','<0.1','<0.1']},
  {code:'AUT',shares:['68.2','8.3','22.4','0.3','0.1','<0.1','0.6']},
  {code:'BLR',shares:['85.1','0.3','13.8','<0.1','<0.1','<0.1','0.7']},
  {code:'BEL',shares:['51.0','6.8','39.0','0.2','0.2','0.3','2.6']},
  {code:'BIH',shares:['44.7','53.6','1.0','<0.1','<0.1','<0.1','0.6']},
  {code:'BGR',shares:['79.5','10.3','10.0','<0.1','<0.1','<0.1','0.1']},
  {code:'HRV',shares:['90.9','1.4','6.7','<0.1','<0.1','<0.1','1.1']},
  {code:'CZE',shares:['26.4','0.3','72.8','<0.1','<0.1','<0.1','0.3']},
  {code:'DNK',shares:['76.9','4.2','16.6','0.7','0.4','0.1','1.0']},
  {code:'EST',shares:['52.6','0.6','43.6','0.2','<0.1','0.1','2.8']},
  {code:'FIN',shares:['72.3','1.6','25.0','0.3','0.1','<0.1','0.5']},
  {code:'FRA',shares:['46.5','9.1','42.6','0.7','0.1','0.7','0.3']},
  {code:'DEU',shares:['56.2','6.5','36.1','0.3','0.2','0.1','0.4']},
  {code:'GRC',shares:['89.5','5.1','4.7','<0.1','<0.1','<0.1','0.5']},
  {code:'HUN',shares:['72.4','0.1','27.0','0.2','<0.1','0.1','0.1']},
  {code:'ISL',shares:['74.9','1.2','19.8','1.3','0.2','0.2','2.4']},
  {code:'IRL',shares:['81.2','1.7','15.6','0.2','0.7','<0.1','0.5']},
  {code:'ITA',shares:['80.5','4.4','13.3','0.6','0.4','<0.1','0.7']},
  {code:'KOS',shares:['5.6','94.3','0.1','<0.1','<0.1','<0.1','<0.1']},
  {code:'LVA',shares:['77.3','0.7','17.0','<0.1','<0.1','0.2','4.7']},
  {code:'LTU',shares:['92.2','<0.1','7.1','<0.1','<0.1','<0.1','0.6']},
  {code:'LUX',shares:['65.9','1.8','25.3','0.5','0.4','0.5','5.7']},
  {code:'MLT',shares:['88.6','3.6','5.2','0.6','1.4','0.3','0.2']},
  {code:'MDA',shares:['99.5','0.2','0.2','<0.1','<0.1','<0.1','<0.1']},
  {code:'MNE',shares:['76.0','21.3','1.1','<0.1','<0.1','<0.1','1.5']},
  {code:'NLD',shares:['35.1','5.5','54.1','0.3','0.6','0.2','4.2']},
  {code:'MKD',shares:['64.7','34.7','0.5','<0.1','<0.1','<0.1','<0.1']},
  {code:'NOR',shares:['71.4','4.1','22.5','0.7','0.2','<0.1','1.0']},
  {code:'POL',shares:['91.2','<0.1','8.6','<0.1','<0.1','<0.1','0.1']},
  {code:'PRT',shares:['85.1','0.4','13.8','0.2','0.2','<0.1','0.3']},
  {code:'ROU',shares:['98.5','0.4','0.9','<0.1','<0.1','<0.1','<0.1']},
  {code:'RUS',shares:['69.9','8.2','20.2','0.4','<0.1','<0.1','1.2']},
  {code:'SRB',shares:['91.5','4.4','4.0','<0.1','<0.1','<0.1','<0.1']},
  {code:'SVK',shares:['73.7','<0.1','25.3','0.1','<0.1','<0.1','0.7']},
  {code:'SVN',shares:['65.4','1.6','32.3','<0.1','<0.1','<0.1','0.6']},
  {code:'ESP',shares:['69.5','3.6','26.4','<0.1','0.1','<0.1','0.4']},
  {code:'SWE',shares:['60.8','8.1','28.9','0.8','0.5','0.2','0.8']},
  {code:'CHE',shares:['61.6','6.1','30.8','0.6','0.5','0.2','0.2']},
  {code:'UKR',shares:['83.4','0.6','15.1','0.3','<0.1','<0.1','0.4']},
  {code:'GBR',shares:['49.4','6.4','40.2','0.5','1.7','0.4','1.4']},
] as const;
export type Pew2020EuropeCode=(typeof pew2020EuropeRows)[number]['code'];
export const pew2020EuropeRow=(code:string)=>pew2020EuropeRows.find(row=>row.code===code);
export const pew2020Share=(value:string)=>!value||value==='<0.1'?null:Number(value);
export const pew2020EuropeSource='https://www.pewresearch.org/religion/feature/religious-composition-by-country-2010-2020/';
export const pew2020EuropeTerms='https://www.pewresearch.org/about/terms-and-conditions/';

