import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('Geoapify gateway client: bounded contract, privacy, cache and cancellation', { timeout: 45000 }, async t => {
  await mkdir('.test-build', { recursive: true });
  const output = path.resolve('.test-build/facility-lookup.js'),report='.test-build/facility-lookup-tests.json';
  await rm(report,{force:true});
  await build({ stdin:{contents:"export * from './app/pilot/facility-lookup';export * from './app/pilot/neshan-links';",resolveDir:process.cwd(),loader:'ts'}, outfile: output, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
  const checks = [], originalFetch = globalThis.fetch,originalNow=Date.now;
  const fixture = { id:'test-geoapify-place-42', name:'بیمارستان نمونه آزمون', address:'خیابان نمونه، تهران', latitude:35.71,longitude:51.42,kind:'hospital',categories:['healthcare.hospital'],classification:'provider-category-unverified' };
  const payload=(location={city:'تهران'},items=[fixture])=>({provider:'geoapify',basis:'city-radius',classification:'provider-category-unverified',city:location.city,province:location.province||'',county:location.county||'',retrievedAt:new Date().toISOString(),center:{latitude:35.71,longitude:51.42},radiusMeters:10000,filteredCount:0,facilities:items});
  const response=(location,items)=>new Response(JSON.stringify(payload(location,items)),{headers:{'content-type':'application/json'}});
  const fromUrl=url=>Object.fromEntries(new URL(url,'https://salamatban.example').searchParams);
  const errorResponse=(error,status)=>new Response(JSON.stringify({error}),{status,headers:{'content-type':'application/json'}});
  const snapshotPayload=()=>({schemaVersion:1,provider:'geoapify',mode:'snapshot',generatedAt:'2026-10-08T12:00:00Z',entries:[{...payload({city:'تهران',province:'تهران',county:'تهران'}),cityId:'ir-tehran'},{...payload({city:'شیراز',province:'فارس',county:'شیراز'}),cityId:'ir-shiraz'}]});
  const snapshotOptions={endpoint:null,snapshotUrl:'./data/care-facilities.geoapify.json'};
  let serial=0;const fresh=()=>import(`${pathToFileURL(output).href}?case=${++serial}`);
  async function check(name,fn){await t.test(name,async()=>{try{await fn();checks.push(name);}finally{globalThis.fetch=originalFetch;Date.now=originalNow;}});}

  await check('only administrative location reaches the configured gateway, with no credentials or provider key',async()=>{
    const m=await fresh(),location={city:'تهران',province:'تهران',county:'تهران',cityId:'internal-id-not-exported'};
    const relative=m.facilitySearchUrl(location),url=new URL(relative,'https://app.example');
    assert.equal(url.pathname,'/api/maps/hospitals');assert.equal(url.hostname,'app.example');assert.deepEqual([...url.searchParams.keys()].sort(),['city','county','province']);assert.ok(!url.href.includes('internal-id'));
    assert.equal(url.searchParams.get('city'),'تهران');assert.equal(new URL(m.facilitySearchUrl({city:'گلوگاه',county:'بابل',province:'مازندران'},'https://maps.example/hospitals')).searchParams.get('county'),'بابل');
    let count=0;globalThis.fetch=async(request,options)=>{count++;assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.redirect,'error');assert.equal(options.method,'GET');assert.deepEqual(options.headers,{Accept:'application/json'});assert.equal(options.body,undefined);return response(fromUrl(request));};
    await assert.rejects(m.lookupFacilities({city:''}),e=>e.code==='location');assert.equal(count,0);
    const result=await m.lookupFacilities(location);assert.equal(result.provider,'geoapify');assert.equal(count,1);
    const manual={city:' TeHran ۱۲ ',province:'ReGion ٣',county:'كوي يكم'};
    const manualUrl=new URL(m.facilitySearchUrl(manual),'https://app.example');assert.equal(manualUrl.searchParams.get('city'),'tehran 12');assert.equal(manualUrl.searchParams.get('province'),'region 3');
    assert.equal(m.parseFacilityResult(payload({city:'tehran 12',province:'region 3',county:'کوی یکم'}),manual).city,'tehran 12');
  });
  await check('missing gateway or server key is not-configured and never falls back to another map provider',async()=>{
    const m=await fresh();let calls=0;globalThis.fetch=async()=>{calls++;return errorResponse('GEOAPIFY_NOT_CONFIGURED',503);};
    for(const endpoint of [null,'','http://not-secure.example/maps','//unknown.example/maps','https://key:secret@example.com/maps','https://example.com/maps?Api-Key=secret'])await assert.rejects(m.lookupFacilities({city:'تهران'},{endpoint}),e=>e.code==='not-configured');
    assert.equal(calls,0);await assert.rejects(m.lookupFacilities({city:'تهران'}),e=>e.code==='not-configured');assert.equal(calls,1);
  });
  await check('bounded successful results retain their unverified basis and generate only official Neshan point links',async()=>{
    const m=await fresh(),result=m.parseFacilityResult(payload(undefined,[{...fixture,sourceUrl:'javascript:alert(1)'},fixture]),{city:'تهران'});
    assert.equal(result.facilities.length,1);assert.equal(result.facilities[0].sourceUrl,'https://nshn.ir/?lat=35.71&lng=51.42');assert.equal(result.facilities[0].classification,'provider-category-unverified');
    assert.equal(m.neshanPointUrl(35.712,51.422),'https://nshn.ir/?lat=35.712&lng=51.422');assert.throws(()=>m.neshanPointUrl(NaN,51));assert.throws(()=>m.neshanPointUrl(95,51));
    for(const entry of [{...fixture,name:''},{...fixture,id:'x'.repeat(201)},{...fixture,name:'x'.repeat(181)},{...fixture,address:'x'.repeat(501)},{...fixture,latitude:'35.71'},{...fixture,latitude:NaN},{...fixture,longitude:181},{...fixture,latitude:1},{...fixture,classification:'verified'},{...fixture,kind:'specialist'},{...fixture,kind:'clinic'},{...fixture,categories:['healthcare.clinic_or_praxis.dentist']}])assert.throws(()=>m.parseFacilities([entry]),e=>e.code==='invalid');
    assert.throws(()=>m.parseFacilities(Array.from({length:7},()=>fixture)),e=>e.code==='invalid');
    for(const override of [{provider:'other'},{basis:'nearest'},{classification:'verified'},{city:'شیراز'},{province:'فارس'},{county:'other'},{retrievedAt:'invalid'},{facilities:{}},{radiusMeters:50000},{center:{latitude:1,longitude:2}},{filteredCount:-1}])assert.throws(()=>m.parseFacilityResult({...payload(),...override},{city:'تهران'}),e=>e.code==='invalid');
    assert.deepEqual(m.parseFacilityResult(payload(undefined,[]),{city:'تهران'}).facilities,[]);
  });
  await check('simultaneous same-city callers share a request and cancelling one does not cancel the other',async()=>{
    const m=await fresh(),a=new AbortController();let count=0,resolveFetch,requestSignal;
    globalThis.fetch=(_url,options)=>{count++;requestSignal=options.signal;return new Promise(resolve=>{resolveFetch=resolve;});};
    const first=m.lookupFacilities({city:'تهران'},{signal:a.signal}),rejected=assert.rejects(first,e=>e.name==='AbortError'),second=m.lookupFacilities({city:'تهران'});
    while(!resolveFetch)await new Promise(resolve=>setTimeout(resolve,5));a.abort();await rejected;assert.equal(requestSignal.aborted,false);resolveFetch(response());const result=await second;
    assert.equal(result.facilities.length,1);assert.equal(count,1);assert.deepEqual(await m.lookupFacilities({city:'تهران'}),result);assert.equal(count,1);
  });
  await check('last-consumer cancellation aborts obsolete city work and prevents stale cache writes',async()=>{
    const m=await fresh(),controller=new AbortController();let resolveFetch,requestSignal,count=0;
    globalThis.fetch=(_url,options)=>{count++;requestSignal=options.signal;return new Promise(resolve=>{resolveFetch=resolve;});};
    const old=m.lookupFacilities({city:'تهران'},{signal:controller.signal}),rejected=assert.rejects(old,e=>e.name==='AbortError');
    while(!resolveFetch)await new Promise(resolve=>setTimeout(resolve,5));controller.abort();await rejected;assert.equal(requestSignal.aborted,true);resolveFetch(response());await new Promise(resolve=>setTimeout(resolve,10));
    globalThis.fetch=async()=>{count++;return response();};await m.lookupFacilities({city:'تهران'});assert.equal(count,2);
  });
  await check('cache keys include gateway endpoint and city, with pacing and explicit refresh',async()=>{
    const m=await fresh(),requests=[];
    globalThis.fetch=async(url)=>{requests.push({url,at:Date.now()});return response(fromUrl(url));};
    await Promise.all([m.lookupFacilities({city:'تهران'}),m.lookupFacilities({city:'شیراز'})]);assert.ok(requests[1].at-requests[0].at>=1090);
    await m.lookupFacilities({city:'تهران'},{endpoint:'https://maps.example/api/maps/hospitals'});assert.equal(requests.length,3);
    await m.lookupFacilities({city:'تهران'});assert.equal(requests.length,3);
    await m.lookupFacilities({city:'تهران'},{refresh:true});assert.equal(requests.length,4);assert.ok(requests[3].at-requests[2].at>=1090);
    const future=Date.now()+16*60*1000;Date.now=()=>future;await m.lookupFacilities({city:'تهران'});assert.equal(requests.length,5);
  });
  await check('failed transport, rate limit and oversized JSON stay distinct from successful empty results',async()=>{
    const m=await fresh();let count=0;
    globalThis.fetch=async()=>{count++;if(count===1)return errorResponse('GEOAPIFY_UNAVAILABLE',502);if(count===2)return errorResponse('GEOAPIFY_RATE_LIMITED',429);if(count===3)return new Response('x'.repeat(64001));return response(undefined,[]);};
    await assert.rejects(m.lookupFacilities({city:'تهران'}),e=>e.code==='unavailable');await assert.rejects(m.lookupFacilities({city:'تهران'}),e=>e.code==='rate-limited'&&e.retryAfterSeconds===30);await assert.rejects(m.lookupFacilities({city:'تهران'}),e=>e.code==='invalid');
    const result=await m.lookupFacilities({city:'تهران'});assert.equal(count,4);assert.deepEqual(result.facilities,[]);assert.ok(Date.parse(result.retrievedAt));
  });
  await check('snapshot uses one fixed local download across cities and never exposes city or health fields in its URL',async()=>{
    const m=await fresh(),requests=[];
    globalThis.fetch=async(url,options)=>{requests.push(url);assert.equal(options.credentials,'omit');assert.equal(options.body,undefined);return new Response(JSON.stringify(snapshotPayload()));};
    const [tehran,shiraz]=await Promise.all([m.lookupFacilities({city:'تهران',cityId:'ir-tehran'},snapshotOptions),m.lookupFacilities({city:'شيراز'},snapshotOptions)]);
    assert.deepEqual(requests,['./data/care-facilities.geoapify.json']);assert.equal(tehran.mode,'snapshot');assert.equal(tehran.snapshotGeneratedAt,'2026-10-08T12:00:00Z');assert.equal(tehran.cityId,'ir-tehran');assert.equal(shiraz.cityId,'ir-shiraz');
    await assert.rejects(m.lookupFacilities({city:'لواسان'},snapshotOptions),e=>e.code==='not-covered');assert.equal(requests.length,1);
    await assert.rejects(m.lookupFacilities({city:'محمودآباد'},snapshotOptions),e=>e.code==='location-unconfirmed');
    await assert.rejects(m.lookupFacilities({city:'گلوگاه',province:'مازندران'},snapshotOptions),e=>e.code==='location-unconfirmed');
    await assert.rejects(m.lookupFacilities({city:'شیراز',cityId:'ir-tehran'},snapshotOptions),e=>e.code==='location-unconfirmed');
    await assert.rejects(m.lookupFacilities({city:'تهران',province:'فارس'},snapshotOptions),e=>e.code==='not-covered');
    await assert.rejects(m.lookupFacilities({city:'تهران'},{endpoint:null,snapshotUrl:'https://elsewhere.example/data.json'}),e=>e.code==='not-configured');
    assert.equal(requests.length,1);
    const broken=snapshotPayload();broken.entries[0].province='فارس';assert.throws(()=>m.parseFacilitySnapshot(broken),e=>e.code==='invalid');
    const duplicate=snapshotPayload();duplicate.entries.push(duplicate.entries[0]);assert.throws(()=>m.parseFacilitySnapshot(duplicate),e=>e.code==='invalid');
  });
  await check('cancelling one city preserves the shared snapshot consumer and configured live failures never use snapshot fallback',async()=>{
    const m=await fresh(),a=new AbortController();let resolveFetch,requestSignal,count=0;
    globalThis.fetch=(_url,options)=>{count++;requestSignal=options.signal;return new Promise(resolve=>{resolveFetch=resolve;});};
    const old=m.lookupFacilities({city:'تهران'},{...snapshotOptions,signal:a.signal}),rejected=assert.rejects(old,e=>e.name==='AbortError');
    const next=m.lookupFacilities({city:'شیراز'},snapshotOptions);while(!resolveFetch)await new Promise(resolve=>setTimeout(resolve,5));a.abort();await rejected;assert.equal(requestSignal.aborted,false);resolveFetch(new Response(JSON.stringify(snapshotPayload())));
    assert.equal((await next).cityId,'ir-shiraz');assert.equal(count,1);
    const urls=[];globalThis.fetch=async(url)=>{urls.push(url);return errorResponse('GEOAPIFY_UNAVAILABLE',502);};
    await assert.rejects(m.lookupFacilities({city:'تهران'},{...snapshotOptions,endpoint:'https://maps.example/api/maps/hospitals'}),e=>e.code==='unavailable');
    assert.equal(urls.length,1);assert.ok(urls[0].startsWith('https://maps.example/'));assert.ok(!urls.some(url=>url.includes('/data/')));
  });
  await check('unconfirmed city, upstream invalid data and explicit Retry-After retain distinct recoverable errors',async()=>{
    const m=await fresh();let count=0;globalThis.fetch=async()=>{count++;return count===1?errorResponse('GEOAPIFY_LOCATION_UNCONFIRMED',422):count===2?errorResponse('GEOAPIFY_UNSUPPORTED_RESPONSE',502):new Response('{"error":"GEOAPIFY_RATE_LIMITED"}',{status:429,headers:{'Retry-After':'2'}});};
    await assert.rejects(m.lookupFacilities({city:'تهران'}),e=>e.code==='location-unconfirmed');await assert.rejects(m.lookupFacilities({city:'تهران'}),e=>e.code==='invalid');await assert.rejects(m.lookupFacilities({city:'تهران'}),e=>e.code==='rate-limited'&&e.retryAfterSeconds===2);
  });
  await check('a hung gateway is aborted after twenty seconds and remains a retryable timeout',async()=>{
    const m=await fresh();let aborted=false;
    globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('aborted','AbortError'));},{once:true}));
    await assert.rejects(m.lookupFacilities({city:'تهران'}),e=>e.code==='timeout');assert.equal(aborted,true);
  });
  assert.equal(checks.length,11);
  await writeFile(report,JSON.stringify({version:'2.3.2',status:'passed',completedAt:new Date().toISOString(),individualPassed:checks.length,checks,scope:'Client contract and lifecycle with mocked gateway/local snapshot responses only. Actual collected snapshot and released UI are checked separately; this suite makes no live provider request.'},null,2)+'\n');
});
