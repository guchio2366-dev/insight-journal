import {readEuropeOverviewReturn} from '../lib/atlas-europe-country-overview-navigation.ts';
import countries from '../data/atlas/europe/countries.json';

export function initEuropeCountryOverviewReturn(root:HTMLElement){
 if(root.dataset.countryOverviewReturnReady)return;
 root.dataset.countryOverviewReturnReady='true';
 const target=readEuropeOverviewReturn(new URLSearchParams(location.search).get('overviewReturn'),location.href);
 const country=countries.find(country=>country.code===target?.searchParams.get('country'));
 const breadcrumb=root.querySelector<HTMLElement>('.eu-breadcrumb');
 if(!target||!country||!breadcrumb)return;
 const link=document.createElement('a');link.className='eu-country-overview-return';link.dataset.euCountryOverviewReturn='';link.href=target.href;
 link.textContent=`← ${country.name}の概要へ戻る`;
 breadcrumb.append(link);
}
