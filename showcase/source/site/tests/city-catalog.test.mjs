import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('.test-build',{recursive:true});
await rm('.test-build/city-catalog-tests.json',{force:true});
await build({entryPoints:['lib/data/cities.ts'],outfile:'.test-build/city-catalog.mjs',bundle:true,platform:'node',format:'esm'});
const {cities,provinces,findCityById,searchCities,normalizeSearch}=await import('../.test-build/city-catalog.mjs');
const metadata=JSON.parse(await readFile('lib/data/iran-cities/SOURCE.json','utf8'));
const results=[];
function check(name,fn){test(name,async()=>{await fn();results.push({name,passed:true});});}
after(async()=>{if(results.length!==7)return;await writeFile('.test-build/city-catalog-tests.json',JSON.stringify({status:'passed',completedAt:new Date().toISOString(),individualPassed:results.length,provinceCount:provinces.length,cityCount:cities.length,sourceRelease:metadata.release,sourceDate:metadata.dataDate,sourceCommit:metadata.commit,checks:results},null,2)+'\n');});

check('Dated MIT source is pinned and shipped with the exact copyright and catalog hash',async()=>{
 assert.equal(metadata.commit,'c653db7122c9ff640e3eafec19341d9a7f3ac54d');
 assert.equal(metadata.license,'MIT');assert.match(metadata.dataDate,/1399-05/);
 const license=await readFile('lib/data/iran-cities/LICENSE.md');
 assert.match(license.toString(),/Copyright \(c\) 2017 Ahmad Azizi/);
 assert.equal(createHash('sha256').update(license).digest('hex'),metadata.files.find(f=>f.path==='LICENSE').sha256);
 assert.equal(createHash('sha256').update(await readFile('lib/data/iran-cities/catalog.json')).digest('hex'),metadata.catalogSha256);
 assert.ok(metadata.files.every(file=>file.url.includes('/'+metadata.commit+'/')&&/^[a-f0-9]{64}$/.test(file.sha256)));
});

check('National suggestions cover 31 provinces, distinct city IDs and no numbered municipal districts',()=>{
 assert.equal(provinces.length,31);assert.equal(new Set(provinces.map(p=>p.id)).size,31);
 assert.equal(cities.length,1355);assert.equal(new Set(cities.map(c=>c.id)).size,cities.length);
 for(const province of provinces){
  const members=cities.filter(city=>city.provinceId===province.id);
  assert.ok(members.length>=6,province.name);assert.ok(members.every(city=>city.province===province.name));
 }
 assert.ok(cities.every(city=>city.name&&city.county&&!/[0-9۰-۹]/.test(city.name)));
 assert.equal(cities.filter(city=>city.name==='فردیس').length,1);
 assert.equal(searchCities('فردیس')[0].province,'البرز');
});

check('All 36 saved city IDs, canonical spellings and province IDs remain compatible',()=>{
 const expected=[
  ['tehran','تهران','tehran'],['mashhad','مشهد','razavi'],['isfahan','اصفهان','isfahan'],['shiraz','شیراز','fars'],['tabriz','تبریز','east-azarbaijan'],['karaj','کرج','alborz'],
  ['ahvaz','اهواز','khuzestan'],['qom','قم','qom'],['kermanshah','کرمانشاه','kermanshah'],['urmia','ارومیه','west-azarbaijan'],['rasht','رشت','gilan'],['zahedan','زاهدان','sistan'],
  ['hamadan','همدان','hamadan'],['kerman','کرمان','kerman'],['yazd','یزد','yazd'],['ardabil','اردبیل','ardabil'],['bandar-abbas','بندرعباس','hormozgan'],['arak','اراک','markazi'],
  ['zanjan','زنجان','zanjan'],['sanandaj','سنندج','kurdistan'],['qazvin','قزوین','qazvin'],['khorramabad','خرم‌آباد','lorestan'],['gorgan','گرگان','golestan'],['sari','ساری','mazandaran'],
  ['bojnurd','بجنورد','north-khorasan'],['bushehr','بوشهر','bushehr'],['birjand','بیرجند','south-khorasan'],['ilam','ایلام','ilam'],['shahrekord','شهرکرد','chaharmahal'],['semnan','سمنان','semnan'],
  ['yasuj','یاسوج','kohgiluyeh'],['kish','کیش','hormozgan'],['kashan','کاشان','isfahan'],['shahinshahr','شاهین‌شهر','isfahan'],['mahmudabad-maz','محمودآباد','mazandaran'],['mahmudabad-west','محمودآباد','west-azarbaijan'],
 ];
 assert.equal(expected.length,36);
 for(const [id,name,province]of expected){const actual=findCityById('ir-'+id);assert.ok(actual,id);assert.equal(actual.name,name);assert.equal(actual.provinceId,'ir-'+province);}
 assert.equal(findCityById('ir-unrecognized-city'),undefined);
});

check('Cities beyond the old capital list are searchable across the country',()=>{
 for(const [name,province]of [['لواسان','تهران'],['بومهن','تهران'],['پاکدشت','تهران'],['پرند','تهران'],['پرندک','مرکزی'],['آبدانان','ایلام'],['گناباد','خراسان رضوی'],['فیروزه','خراسان رضوی'],['سیراف','بوشهر'],['نطنز','اصفهان'],['بانه','کردستان'],['فردیس','البرز']]){
  assert.ok(searchCities(name).some(city=>city.name===name&&city.province===province),`${name} / ${province}`);
 }
});

check('Arabic letters, Persian digits, whitespace and half-spaces preserve meaningful matching',()=>{
 assert.equal(searchCities('  كرج  ')[0].id,'ir-karaj');
 assert.equal(searchCities('شيراز')[0].id,'ir-shiraz');
 for(const query of ['شاهین شهر','شاهین‌شهر','شاهينشهر',' شاهين  شهر '])assert.equal(searchCities(query)[0].id,'ir-shahinshahr',query);
 for(const query of ['خرم آباد','خرم‌آباد','خرمآباد'])assert.equal(searchCities(query)[0].id,'ir-khorramabad',query);
 assert.equal(normalizeSearch(' كد ۱۲٣\u200cي '),'کد 123 ی');
 assert.ok(searchCities('بندر عباس').some(city=>city.id==='ir-bandar-abbas'));
 assert.equal(searchCities('چابهار')[0].id,'ir-city-1399-470');assert.equal(searchCities('چاه بهار')[0].id,'ir-city-1399-470');
});

check('Exact cities rank ahead of prefix and province matches; duplicate names retain context',()=>{
 const mahmud=searchCities('محمودآباد');assert.equal(mahmud.length,3);
 assert.deepEqual(new Set(mahmud.slice(0,2).map(city=>city.province)),new Set(['مازندران','آذربایجان غربی']));
 assert.equal(mahmud[2].name,'محمودآبادنمونه');
 assert.equal(searchCities('تهران')[0].id,'ir-tehran');
 assert.equal(searchCities('محمود آباد مازندران')[0].id,'ir-mahmudabad-maz');
 assert.equal(searchCities('مازندران محمودآباد')[0].id,'ir-mahmudabad-maz');
 const golugah=searchCities('گلوگاه',{provinceId:'ir-mazandiran'});assert.equal(golugah.length,0);
 const sameProvince=searchCities('گلوگاه',{provinceId:'ir-mazandaran'});assert.equal(sameProvince.length,2);
 assert.deepEqual(new Set(sameProvince.map(city=>city.county)),new Set(['بابل','گلوگاه']));
 assert.equal(searchCities('گلوگاه بابل')[0].county,'بابل');
});

check('Search limits and unknown text do not silently invent a selection',()=>{
 assert.equal(searchCities('').length,12);assert.equal(searchCities('',{limit:0}).length,0);
 assert.equal(searchCities('',{limit:2}).length,2);assert.deepEqual(searchCities('شهر ساختگی ۱۲'),[]);
 assert.ok(searchCities('',{provinceId:'ir-fars',limit:1000}).every(city=>city.province==='فارس'));
 assert.ok(searchCities('ك').some(city=>city.id==='ir-karaj'),'Familiar exact-prefix suggestions remain reachable');
});
