import catalog from './iran-cities/catalog.json';

/** National suggestions from the MIT-licensed Ahmad Azizi v3.0 snapshot (1399).
 * See iran-cities/SOURCE.json and LICENSE.md. This is not a current official register.
 * Internal IDs are stable; free-text entry remains supported.
 */
export type City = { id: string; provinceId: string; name: string; province: string; county?: string };
export type Province = { id: string; name: string };
// Preserve the original IDs AND spellings: saved profiles are checked against both.
const rows = [
 ['tehran','تهران','tehran','تهران'],['mashhad','مشهد','razavi','خراسان رضوی'],['isfahan','اصفهان','isfahan','اصفهان'],
 ['shiraz','شیراز','fars','فارس'],['tabriz','تبریز','east-azarbaijan','آذربایجان شرقی'],['karaj','کرج','alborz','البرز'],
 ['ahvaz','اهواز','khuzestan','خوزستان'],['qom','قم','qom','قم'],['kermanshah','کرمانشاه','kermanshah','کرمانشاه'],
 ['urmia','ارومیه','west-azarbaijan','آذربایجان غربی'],['rasht','رشت','gilan','گیلان'],['zahedan','زاهدان','sistan','سیستان و بلوچستان'],
 ['hamadan','همدان','hamadan','همدان'],['kerman','کرمان','kerman','کرمان'],['yazd','یزد','yazd','یزد'],
 ['ardabil','اردبیل','ardabil','اردبیل'],['bandar-abbas','بندرعباس','hormozgan','هرمزگان'],['arak','اراک','markazi','مرکزی'],
 ['zanjan','زنجان','zanjan','زنجان'],['sanandaj','سنندج','kurdistan','کردستان'],['qazvin','قزوین','qazvin','قزوین'],
 ['khorramabad','خرم‌آباد','lorestan','لرستان'],['gorgan','گرگان','golestan','گلستان'],['sari','ساری','mazandaran','مازندران'],
 ['bojnurd','بجنورد','north-khorasan','خراسان شمالی'],['bushehr','بوشهر','bushehr','بوشهر'],['birjand','بیرجند','south-khorasan','خراسان جنوبی'],
 ['ilam','ایلام','ilam','ایلام'],['shahrekord','شهرکرد','chaharmahal','چهارمحال و بختیاری'],['semnan','سمنان','semnan','سمنان'],
 ['yasuj','یاسوج','kohgiluyeh','کهگیلویه و بویراحمد'],['kish','کیش','hormozgan','هرمزگان'],['kashan','کاشان','isfahan','اصفهان'],
 ['shahinshahr','شاهین‌شهر','isfahan','اصفهان'],['mahmudabad-maz','محمودآباد','mazandaran','مازندران'],['mahmudabad-west','محمودآباد','west-azarbaijan','آذربایجان غربی'],
];
export function normalizeSearch(value:string) { return value.replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/ي|ى/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\s]+/g,' ').trim().toLowerCase(); }

const legacyCities: City[] = rows.map(([id,name,provinceId,province])=>({id:`ir-${id}`,name,provinceId:`ir-${provinceId}`,province}));
// Source province row IDs, mapped to the application's established province IDs.
const provinceOrder = ['east-azarbaijan','west-azarbaijan','ardabil','isfahan','alborz','ilam','bushehr','tehran','chaharmahal','south-khorasan','razavi','north-khorasan','khuzestan','zanjan','semnan','sistan','fars','qazvin','qom','kurdistan','kerman','kermanshah','kohgiluyeh','golestan','gilan','lorestan','mazandaran','markazi','hormozgan','hamadan','yazd'];
export const provinces: Province[] = provinceOrder.map(id=>({id:`ir-${id}`,name:legacyCities.find(c=>c.provinceId===`ir-${id}`)!.province}));
const compact = (value:string)=>normalizeSearch(value).replace(/ /g,'');
const legacyByName = new Map(legacyCities.map(c=>[`${c.provinceId}:${compact(c.name)}`,c]));
const expanded: City[] = catalog.map(row=>{
 const province=provinces[row.provinceCode-1];
 const legacy=legacyByName.get(`${province.id}:${compact(row.name)}`);
 return {...(legacy||{id:`ir-city-1399-${row.sourceId}`,name:normalizeSearch(row.name),provinceId:province.id,province:province.name}),county:normalizeSearch(row.county)};
});
const expandedById=new Map(expanded.map(c=>[c.id,c]));
// Put familiar legacy suggestions first only when relevance is equal.
export const cities: City[] = [...legacyCities.map(c=>expandedById.get(c.id)||c),...expanded.filter(c=>!legacyCities.some(old=>old.id===c.id))];
const byId = new Map(cities.map(c=>[c.id,c]));
export function findCityById(id:string):City|undefined { return byId.get(id); }

// Common spelling differs from the historical source's «چاه بهار».
const aliases:Record<string,string[]>={'ir-city-1399-470':['چابهار']};
const index=cities.map(city=>({city,names:[city.name,...(aliases[city.id]||[])].map(compact),province:compact(city.province),county:compact(city.county||'')}));
/** Exact names precede prefixes and province-only matches. Spaces/half-spaces and
 * Arabic ی/ک variants are equivalent; province/county words can disambiguate.
 * An empty query returns familiar suggestions. No match means [] (not a guess).
 */
export function searchCities(query:string,{provinceId,limit=12}:{provinceId?:string;limit?:number}={}):City[] {
 const normalized=normalizeSearch(query),needle=compact(query),words=normalized.split(' ').filter(Boolean);
 const count=Number.isFinite(limit)?Math.max(0,Math.floor(limit)):cities.length;
 return index.flatMap((item,order)=>{
  if(provinceId&&item.city.provinceId!==provinceId)return [];
  const full=item.names.join(' ')+item.province+item.county;
  const cityMatch=item.names.some(name=>name.includes(needle));
  const provinceMatch=item.province.includes(needle);
  // County is a qualifier, not a separate city: «محمودآباد» should not also
  // suggest unrelated city names merely located in Mahmoudabad county.
  const qualified=words.length>1&&words.every(word=>full.includes(word))&&words.some(word=>item.names.some(name=>name.includes(word)));
  if(needle&&!cityMatch&&!provinceMatch&&!qualified)return [];
  const rank=!needle?0:item.names.includes(needle)?0:item.names.some(name=>name.startsWith(needle))?1:cityMatch?2:qualified?3:4;
  return [{city:item.city,rank,order}];
 }).sort((a,b)=>a.rank-b.rank||a.order-b.order).slice(0,count).map(item=>item.city);
}
