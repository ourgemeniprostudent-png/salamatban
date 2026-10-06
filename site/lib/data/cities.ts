/** Editorial starter catalog v1. Stable internal IDs, not official census codes.
 * Covers provincial capitals and selected common cities, not all Iranian cities.
 * Add entries here with unique IDs; manual city entry is always available.
 */
export type City = { id: string; provinceId: string; name: string; province: string };
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
export const cities: City[] = rows.map(([id,name,provinceId,province])=>({id:`ir-${id}`,name,provinceId:`ir-${provinceId}`,province}));
export function normalizeSearch(value:string) { return value.replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/ي|ى/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\s]+/g,' ').trim().toLowerCase(); }
