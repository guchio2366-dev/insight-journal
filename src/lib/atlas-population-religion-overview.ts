export const religionOverviewCategoryIds=['protestant','catholic','other_christian_broad','non_christian_broad','unaffiliated'] as const;

export type ReligionOverview={
 schemaVersion:1;
 classificationId:'pew-rls-2023-24-overview-5';
 period:string;
 universe:'adults';
 geography:'United States';
 source:{url:string;title:string;publisher:string;published:string;copyright:string};
 categories:{id:typeof religionOverviewCategoryIds[number];label:string;value:number}[];
 publishedPrecision:'whole_percent';
 remainderLabel:string;
};

export function validateReligionOverview(value:any):value is ReligionOverview{
 if(value?.schemaVersion!==1||value.classificationId!=='pew-rls-2023-24-overview-5'||value.universe!=='adults'||value.geography!=='United States'||value.publishedPrecision!=='whole_percent')return false;
 if(!value.source?.url?.startsWith('https://www.pewresearch.org/')||!value.source.title||!value.source.publisher||!value.source.published||!value.source.copyright||!value.remainderLabel)return false;
 if(!Array.isArray(value.categories)||value.categories.length!==religionOverviewCategoryIds.length)return false;
 const ids=new Set(value.categories.map((item:any)=>item?.id));
 if(ids.size!==religionOverviewCategoryIds.length||religionOverviewCategoryIds.some(id=>!ids.has(id)))return false;
 return value.categories.every((item:any)=>typeof item.label==='string'&&Number.isFinite(item.value)&&item.value>=0&&item.value<=100)&&value.categories.reduce((sum:number,item:any)=>sum+item.value,0)<=100;
}
