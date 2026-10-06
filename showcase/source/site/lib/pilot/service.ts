import { PilotError, sampleAccounts, phoneNumber, text, asciiDigits, policyText, policyVersion, clinicalConsentText, coordinationConsentText, validateProfile, validateActions, detectedType, canReadClinical, type Role, type Action } from './domain';
import { cleanLocation } from './location';
import { cities } from '../data/cities';
import { assessmentDefinition } from '../assessment-definition';
import { cleanAnswers, isUrgent } from './intake';
import { hash, keyedHash, equal, randomToken, randomCode, verifyTotp } from './crypto';
import { requireLiveReady, type Settings } from './config';
import { sendOtp, requestPayment, verifyPayment, scanFile } from './providers';

// D1 rows are projected explicitly before crossing the API boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>; // SQL rows stay internal; explicit projections define each response.
type Context = {db:D1Database;files:R2Bucket;c:Settings};
const now=()=>Date.now(), id=()=>crypto.randomUUID();
const parse=(s:string|null)=>s?JSON.parse(s):null;
const json=(data:unknown,status=200,extra:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const publicUser=(u:Row)=>({id:u.id,name:u.name,role:u.role,phone:u.phone});
async function boundedBody(request:Request,max:number){
  const reader=request.body?.getReader();if(!reader)return new Uint8Array();
  const chunks:Uint8Array[]=[];let total=0;
  while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>max){await reader.cancel();throw new PilotError('PAYLOAD_TOO_LARGE',413);}chunks.push(part.value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
export async function handlePilot(request:Request,ctx:Context):Promise<Response> {
  const {db,files,c}=ctx, url=new URL(request.url), path=url.pathname.replace('/api/pilot/','');
  const q=(sql:string,...args:unknown[])=>db.prepare(sql).bind(...args);
  const one=(sql:string,...args:unknown[])=>q(sql,...args).first<Row>();
  const all=async(sql:string,...args:unknown[])=>(await q(sql,...args).all<Row>()).results;
  const run=(sql:string,...args:unknown[])=>q(sql,...args).run();
  const audit=(actor:string,subject:string,action:string,resource='')=>run('INSERT INTO pilot_audit VALUES (?,?,?,?,?,?,?)',id(),actor,subject,action,resource,'success',now());
  const limit=async(key:string,max:number,windowMs:number)=>{
    const r=await one('INSERT INTO pilot_rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count,expires_at',key,now()+windowMs,now(),now());
    if(Number(r?.count)>max)throw new PilotError('RATE_LIMITED',429,{retryAfterSeconds:Math.max(1,Math.ceil((Number(r?.expires_at)-now())/1000))});
  };
  const record=async(uid:string)=>{
    await run('INSERT OR IGNORE INTO pilot_records(user_id,updated_at) VALUES (?,?)',uid,now());
    return (await one('SELECT * FROM pilot_records WHERE user_id=?',uid))!;
  };
  const paymentView=(r:Row)=>({id:r.id,status:r.status,amountRial:r.amount_rial,reference:r.reference,mode:r.mode,createdAt:r.created_at,redirect:r.status==='pending'&&r.authority&&r.mode==='live'?`https://payment.zarinpal.com/pg/StartPay/${r.authority}`:null});
  // A plan action owned by the coordination team creates one durable booking task.
  const teamTasks=(uid:string,pid:string,actions:Action[],city:string)=>actions.filter(a=>a.owner==='team').flatMap(a=>{
    const taskId=`${pid}:${a.id}`;
    return [
      q("INSERT OR IGNORE INTO pilot_tasks(id,user_id,kind,status,title,preferred,created_at,updated_at) SELECT ?,?,'booking','requested',?,?,?,? WHERE EXISTS(SELECT 1 FROM pilot_plans p JOIN pilot_records r ON r.user_id=p.user_id WHERE p.id=? AND p.user_id=? AND p.version=(SELECT max(version) FROM pilot_plans WHERE user_id=p.user_id) AND r.status='published')",taskId,uid,a.title,`${city} · موعد اقدام: ${a.due}`,now(),now(),pid,uid),
      q('INSERT OR IGNORE INTO pilot_task_actions(task_id,plan_id,action_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM pilot_tasks WHERE id=?)',taskId,pid,a.id,taskId),
    ];
  });
  const verifyOrder=async(order:Row)=>{
    if(order.status==='paid')return;
    if(order.mode!==c.mode||!order.authority||!['pending','reconciliation'].includes(order.status))throw new PilotError('INVALID_PAYMENT_STATE',409);
    try {
      const ref=await verifyPayment(c,order.authority,order.amount_rial);
      await run("UPDATE pilot_orders SET status='paid',reference=?,paid_at=?,updated_at=? WHERE id=? AND status IN ('pending','reconciliation')",ref,now(),now(),order.id);
      await audit('gateway',order.user_id,'payment_verified',order.id);
    }catch(e){await run("UPDATE pilot_orders SET status='reconciliation',updated_at=? WHERE id=? AND status!='paid'",now(),order.id);throw e;}
  };
  try {
    requireLiveReady(c);
    if(c.mode==='demo') {
      await db.batch(sampleAccounts.map(a=>q('INSERT INTO pilot_users(id,phone,name,role,clinician_id,created_at) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pilot_users WHERE phone=?)',`demo-${a.role}-${a.phone.slice(-2)}`,a.phone,a.name,a.role,a.role==='member'?'demo-clinician-11':null,now(),a.phone)));
    }
    if(path==='meta'&&request.method==='GET')return json({mode:c.mode,priceRial:c.priceRial,policyVersion:c.consentVersion||policyVersion,policyText:c.consentBody||policyText,clinicalConsentText,coordinationConsentText,samples:c.mode==='demo'?sampleAccounts:[]});
    if(path==='payment/callback'&&request.method==='GET') {
      const authority=url.searchParams.get('Authority')||'';
      const order=await one('SELECT * FROM pilot_orders WHERE authority=? AND mode=?',authority,c.mode);
      if(order) {await limit(`callback:${order.id}`,12,60000);try{await verifyOrder(order);}catch{/* User sees persisted pending/reconciliation, never callback Status. */}}
      return new Response(null,{status:303,headers:{Location:`${c.origin}/pilot?payment=returned`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    }
    if(request.method!=='GET'&&request.headers.get('origin')!==c.origin)throw new PilotError('BAD_ORIGIN',403);
    let body:Row={};
    if(request.method!=='GET'&&!path.startsWith('files')) {
      if(!request.headers.get('content-type')?.includes('application/json'))throw new PilotError('JSON_REQUIRED',415);
      const raw=new TextDecoder().decode(await boundedBody(request,50_000));
      try{body=JSON.parse(raw);}catch{throw new PilotError('INVALID_JSON',400);}
      if(!body||typeof body!=='object'||Array.isArray(body))throw new PilotError('INVALID_JSON');
    }
    if(path==='auth/request'&&request.method==='POST') {
      const phone=phoneNumber(body.phone), code=randomCode(), challenge=id();
      await limit(`otp:${await keyedHash(c.authSecret,phone)}`,3,10*60000);
      // Cloudflare supplies the connection IP; client-supplied forwarding headers are never used.
      await limit(`ip:${await keyedHash(c.authSecret,request.headers.get('cf-connecting-ip')||'local')}`,30,10*60000);
      const user=await one('SELECT * FROM pilot_users WHERE phone=? AND active=1',phone);
      await run('UPDATE pilot_otp SET used_at=? WHERE phone=? AND used_at IS NULL',now(),phone);
      await run('INSERT INTO pilot_otp(id,phone,digest,expires_at,created_at) VALUES (?,?,?,?,?)',challenge,phone,await keyedHash(c.authSecret,`${challenge}:${code}`),now()+3*60000,now());
      if(user&&c.mode==='live')await sendOtp(c,phone,code);
      return json({challenge,expiresIn:180,message:'اگر شماره در فهرست دعوت باشد، کد ارسال می‌شود.',...(c.mode==='demo'?{demoCode:code}: {})});
    }
    if(path==='auth/verify'&&request.method==='POST') {
      const challenge=text(body.challenge,80), otp=await one('SELECT * FROM pilot_otp WHERE id=?',challenge);
      if(!otp||otp.used_at||otp.expires_at<=now()||otp.attempts>=5)throw new PilotError('INVALID_CODE',401);
      const attempt=await run('UPDATE pilot_otp SET attempts=attempts+1 WHERE id=? AND attempts<5 AND used_at IS NULL AND expires_at>?',challenge,now());
      if(!attempt.meta.changes)throw new PilotError('INVALID_CODE',401);
      const user=await one('SELECT * FROM pilot_users WHERE phone=? AND active=1',otp.phone);
      if(!user||!equal(otp.digest,await keyedHash(c.authSecret,`${challenge}:${asciiDigits(text(body.code,10))}`)))throw new PilotError('INVALID_CODE',401);
      if(user.role!=='member'&&c.mode==='live') {
        const secret=c.staffTotp[user.phone];
        if(!secret||!await verifyTotp(secret,asciiDigits(text(body.totp,10))))throw new PilotError('STAFF_MFA_REQUIRED',401);
        const replay=`mfa:${user.id}:${await keyedHash(c.authSecret,asciiDigits(text(body.totp,10)))}`;
        await limit(replay,1,90000);
      }
      const consumed=await run('UPDATE pilot_otp SET used_at=? WHERE id=? AND used_at IS NULL',now(),challenge);
      if(!consumed.meta.changes)throw new PilotError('INVALID_CODE',401);
      const token=randomToken(),csrf=randomToken(),seconds=user.role==='member'?86400:3600;
      await run('INSERT INTO pilot_sessions VALUES (?,?,?,?,?)',await hash(token),user.id,csrf,now()+seconds*1000,now());
      await audit(user.id,user.id,'login');
      return json({user:publicUser(user),csrf},200,{'Set-Cookie':`pilot_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${c.mode==='live'?'; Secure':''}`});
    }
    const token=request.headers.get('cookie')?.match(/(?:^|;\s*)pilot_session=([a-f0-9]{64})(?:;|$)/)?.[1]||'';
    const session=token?await one('SELECT s.*,u.id,u.phone,u.name,u.role,u.clinician_id FROM pilot_sessions s JOIN pilot_users u ON u.id=s.user_id WHERE s.digest=? AND s.expires_at>? AND u.active=1',await hash(token),now()):null;
    if(!session)throw new PilotError('UNAUTHENTICATED',401);
    const user=session;
    if(request.method!=='GET'&&!equal(request.headers.get('x-csrf-token')||'',session.csrf))throw new PilotError('BAD_CSRF',403);
    const role=(...roles:Role[])=>{if(!roles.includes(user.role))throw new PilotError('FORBIDDEN',403);};
    const clinical=async(uid:string)=>{const owner=await one('SELECT * FROM pilot_users WHERE id=? AND role=?',uid,'member');if(!owner||!canReadClinical(user.role,user.id,uid,owner.clinician_id))throw new PilotError('NOT_FOUND',404);return owner;};
    if(path==='auth/logout'&&request.method==='POST') {await run('DELETE FROM pilot_sessions WHERE digest=?',session.digest);return json({ok:true},200,{'Set-Cookie':'pilot_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});}
    if(path==='me'&&request.method==='GET')return json({user:publicUser(user),csrf:session.csrf});
    if(path==='record'&&request.method==='GET') {
      const uid=url.searchParams.get('user')||user.id;const owner=await clinical(uid);const r=await record(uid);
      const doctor=await one("SELECT name,phone FROM pilot_users WHERE id=? AND role='clinician'",owner.clinician_id);
      const plans=await all('SELECT p.id,p.version,p.summary,p.actions,p.published_at,u.name AS reviewer FROM pilot_plans p JOIN pilot_users u ON u.id=p.reviewer_id WHERE p.user_id=? ORDER BY p.version DESC',uid);
      const updates=await all('SELECT plan_id,action_id,done,evidence,created_at FROM pilot_action_updates WHERE user_id=? ORDER BY created_at',uid);
      await audit(user.id,uid,'record_read');
      return json({clinician:doctor?{name:doctor.name,...(c.mode==='demo'?{demoPhone:doctor.phone}:{})}:null,record:{...r,profile:parse(r.profile),answers:parse(r.answers)},files:await all('SELECT id,name,mime,size,scan_status FROM pilot_files WHERE user_id=?',uid),plans:plans.map(p=>({...p,actions:parse(p.actions)})),updates,orders:(await all('SELECT * FROM pilot_orders WHERE user_id=? ORDER BY created_at DESC',uid)).map(paymentView),tasks:await all("SELECT t.id,t.kind,t.status,t.title,t.preferred,t.provider,t.scheduled_at,t.reference,t.note,l.address,l.unit,l.entrance,l.latitude,l.longitude,ta.plan_id,ta.action_id FROM pilot_tasks t LEFT JOIN pilot_task_actions ta ON ta.task_id=t.id LEFT JOIN pilot_booking_locations l ON l.task_id=t.id AND ?=1 WHERE t.user_id=? AND t.kind='booking' ORDER BY t.created_at DESC",user.role==='member'?1:0,uid),feedback:await all('SELECT id,kind,message,status,reply FROM pilot_feedback WHERE user_id=? ORDER BY created_at DESC',uid)});
    }
    if(path==='record'&&request.method==='PUT') {
      role('member');const r=await record(user.id);
      if(!['draft','needs_information'].includes(r.status))throw new PilotError('RECORD_LOCKED',409);
      const profile=body.profile&&typeof body.profile==='object'?Object.fromEntries(['firstName','lastName','birthDate','city','cityId','provinceId','goal','insurance'].map(k=>[k,text(body.profile[k],k==='goal'?400:100)])):parse(r.profile);
      if(profile.cityId){const city=cities.find(c=>c.id===profile.cityId&&c.name===profile.city&&c.provinceId===profile.provinceId);if(!city){profile.cityId='';profile.provinceId='';}}
      const answers=cleanAnswers(body.answers??parse(r.answers));
      const previousAnswers=parse(r.answers)||{};
      const newAlert=assessmentDefinition.questions.some(question=>question.redFlag&&answers[question.id]==='yes'&&previousAnswers[question.id]!=='yes');
      // A member correction cannot close an unresolved alert that already reached the team.
      const urgent=isUrgent(answers)||(r.urgent&&!r.urgent_resolved_at)?1:0;
      const urgentResolvedAt=urgent&&!newAlert?r.urgent_resolved_at:null;
      if(body.consent===false||(!r.consent_at&&body.consent!==true))throw new PilotError('CONSENT_REQUIRED',422);
      const accepted=body.consent===true, version=c.consentVersion||policyVersion;
      const result=await run('UPDATE pilot_records SET profile=?,answers=?,step=?,version=version+1,consent_version=?,consent_hash=?,consent_at=?,coordination_consent=?,urgent=?,urgent_resolved_at=?,updated_at=? WHERE user_id=? AND version=? AND status IN (\'draft\',\'needs_information\')',JSON.stringify(profile),JSON.stringify(answers),Math.max(0,Math.min(5,Number(body.step)||0)),accepted?version:r.consent_version,accepted?await hash((c.consentBody||policyText)+clinicalConsentText):r.consent_hash,accepted?now():r.consent_at,body.coordination===true?1:body.coordination===false?0:r.coordination_consent,urgent,urgentResolvedAt,now(),user.id,Number(body.version));
      if(!result.meta.changes)throw new PilotError('VERSION_CONFLICT',409);
      if(urgent&&!urgentResolvedAt)await run("INSERT INTO pilot_tasks(id,user_id,kind,status,title,created_at,updated_at) SELECT ?,?,'urgent','open','تماس فوری توسط پزشک',?,? WHERE NOT EXISTS(SELECT 1 FROM pilot_tasks WHERE user_id=? AND kind='urgent' AND status='open')",id(),user.id,now(),now(),user.id);
      await audit(user.id,user.id,'draft_saved');return json({version:r.version+1,urgent:!!urgent,urgentResolvedAt});
    }
    if(path==='record/submit'&&request.method==='POST') {
      role('member');const r=await record(user.id);validateProfile(parse(r.profile));cleanAnswers(parse(r.answers),true);
      if(r.urgent&&!r.urgent_resolved_at)throw new PilotError('URGENT_REVIEW_REQUIRED',409);
      if(r.consent_version!==(c.consentVersion||policyVersion))throw new PilotError('CONSENT_REQUIRED',422);
      if(!await one("SELECT id FROM pilot_orders WHERE user_id=? AND status='paid' AND mode=?",user.id,c.mode))throw new PilotError('PAYMENT_REQUIRED',402);
      const result=await run("UPDATE pilot_records SET status='submitted',submitted_at=?,version=version+1,updated_at=? WHERE user_id=? AND version=? AND status IN ('draft','needs_information')",now(),now(),user.id,Number(body.version));
      if(!result.meta.changes)throw new PilotError('VERSION_CONFLICT',409);
      await audit(user.id,user.id,'submitted');return json({ok:true});
    }
    if(path==='files'&&request.method==='POST') {
      role('member');const r=await record(user.id);if(!['draft','needs_information'].includes(r.status)||!r.consent_at)throw new PilotError('RECORD_LOCKED',409);
      if(Number(request.headers.get('content-length'))>11*1024*1024)throw new PilotError('FILE_TOO_LARGE',413);
      const bounded=new Request(request.url,{method:'POST',headers:request.headers,body:await boundedBody(request,11*1024*1024)});
      const form=await bounded.formData(),file=form.get('file');if(!(file instanceof File)||!file.size||file.size>10*1024*1024)throw new PilotError('FILE_TOO_LARGE',413);
      const bytes=await file.arrayBuffer(),mime=detectedType(new Uint8Array(bytes));if(!mime||mime!==file.type)throw new PilotError('FILE_TYPE',422);
      const checksum=await hash(bytes);if(await one('SELECT id FROM pilot_files WHERE user_id=? AND sha256=?',user.id,checksum))throw new PilotError('DUPLICATE_FILE',409);
      await limit(`upload:${user.id}`,10,60*60000);
      const count=await one('SELECT count(*) n FROM pilot_files WHERE user_id=?',user.id);if(count!.n>=10)throw new PilotError('FILE_LIMIT',422);
      const fid=id(),key=`pilot/${user.id}/${fid}`;
      if(c.mode==='live')await scanFile(c,bytes,checksum,mime);
      await files.put(key,bytes,{httpMetadata:{contentType:mime}});
      try{
        const results=await db.batch([
          q("INSERT INTO pilot_files SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pilot_records WHERE user_id=? AND version=? AND status IN ('draft','needs_information'))",fid,user.id,key,text(file.name.replace(/[\r\n\x00-\x1f]/g,''),120),mime,file.size,checksum,c.mode==='demo'?'demo_only':'clean',now(),user.id,r.version),
          q('UPDATE pilot_records SET version=version+1,updated_at=? WHERE user_id=? AND version=? AND EXISTS(SELECT 1 FROM pilot_files WHERE id=?)',now(),user.id,r.version,fid),
        ]);
        if(!results[0].meta.changes)throw new PilotError('VERSION_CONFLICT',409);
      }catch(e){await files.delete(key);throw e;}
      await audit(user.id,user.id,'file_uploaded',fid);return json({id:fid});
    }
    if(path.startsWith('files/')&&request.method==='GET') {
      const f=await one('SELECT * FROM pilot_files WHERE id=?',path.slice(6));if(!f)throw new PilotError('NOT_FOUND',404);await clinical(f.user_id);
      if(!['clean',...(c.mode==='demo'?['demo_only']:[])].includes(f.scan_status))throw new PilotError('FILE_NOT_CLEARED',403);
      const object=await files.get(f.object_key);if(!object)throw new PilotError('NOT_FOUND',404);await audit(user.id,f.user_id,'file_downloaded',f.id);
      return new Response(object.body,{headers:{'Content-Type':f.mime,'Content-Disposition':`attachment; filename="document.${f.mime==='application/pdf'?'pdf':f.mime==='image/png'?'png':'jpg'}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(path==='payment'&&request.method==='POST') {
      role('member');const r=await record(user.id);validateProfile(parse(r.profile));cleanAnswers(parse(r.answers),true);
      if(!r.consent_at)throw new PilotError('CONSENT_REQUIRED',422);if(r.urgent&&!r.urgent_resolved_at)throw new PilotError('URGENT_REVIEW_REQUIRED',409);
      const existing=await one("SELECT * FROM pilot_orders WHERE user_id=? AND mode=? AND status IN ('paid','requesting','pending','reconciliation') ORDER BY created_at DESC LIMIT 1",user.id,c.mode);
      if(existing)return json(paymentView(existing));
      const oid=id();await run("INSERT INTO pilot_orders(id,user_id,amount_rial,pricing_version,mode,status,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,?,'requesting',?,?,?)",oid,user.id,c.priceRial,c.pricingVersion,c.mode,oid,now(),now());
      try {
        const authority=c.mode==='demo'?`demo-${oid}`:await requestPayment(c,{id:oid,amount_rial:c.priceRial});
        await run("UPDATE pilot_orders SET status='pending',authority=?,updated_at=? WHERE id=?",authority,now(),oid);
      }catch(e){await run("UPDATE pilot_orders SET status='reconciliation',updated_at=? WHERE id=?",now(),oid);throw e;}
      await audit(user.id,user.id,'payment_requested',oid);return json(paymentView((await one('SELECT * FROM pilot_orders WHERE id=?',oid))!));
    }
    if(path==='payment/demo'&&request.method==='POST') {
      role('member');if(c.mode!=='demo')throw new PilotError('NOT_FOUND',404);
      if(!['paid','failed'].includes(body.result))throw new PilotError('INVALID_STATE');
      const order=await one("SELECT * FROM pilot_orders WHERE id=? AND user_id=? AND mode='demo'",text(body.id,80),user.id);
      if(!order)throw new PilotError('NOT_FOUND',404);
      if(order.status===body.result)return json({ok:true});
      if(order.status!=='pending')throw new PilotError('INVALID_PAYMENT_STATE',409);
      await run("UPDATE pilot_orders SET status=?,reference=?,paid_at=?,updated_at=? WHERE id=? AND user_id=? AND mode='demo' AND status='pending'",body.result,body.result==='paid'?`DEMO-${id()}`:null,body.result==='paid'?now():null,now(),text(body.id,80),user.id);return json({ok:true});
    }
    if(path==='payment/reconcile'&&request.method==='POST') {
      role('member','admin');const o=await one('SELECT * FROM pilot_orders WHERE id=?',text(body.id,80));if(!o||(user.role==='member'&&o.user_id!==user.id))throw new PilotError('NOT_FOUND',404);await limit(`verify:${o.id}`,5,60000);await verifyOrder(o);return json({ok:true});
    }
    if(path==='staff/queue'&&request.method==='GET') {
      role('clinician','coordinator','admin');
      if(user.role==='clinician')return json({members:await all("SELECT u.id,u.name,r.status,r.urgent,r.urgent_resolved_at,r.submitted_at FROM pilot_users u JOIN pilot_records r ON r.user_id=u.id WHERE u.clinician_id=? AND u.active=1 AND (r.status!='draft' OR r.urgent=1) ORDER BY r.urgent DESC,r.submitted_at",user.id)});
      if(user.role==='coordinator')return json({tasks:await all("SELECT t.*,u.name,u.phone,ta.plan_id,ta.action_id,l.address,l.unit,l.entrance,l.latitude,l.longitude FROM pilot_tasks t JOIN pilot_users u ON u.id=t.user_id LEFT JOIN pilot_task_actions ta ON ta.task_id=t.id LEFT JOIN pilot_booking_locations l ON l.task_id=t.id WHERE t.kind='booking' AND u.active=1 ORDER BY t.created_at DESC")});
      return json({counts:await one("SELECT (SELECT count(*) FROM pilot_users WHERE role='member' AND active=1) members,(SELECT count(*) FROM pilot_records WHERE submitted_at IS NOT NULL) submitted,(SELECT count(DISTINCT user_id) FROM pilot_orders WHERE status='paid') paid,(SELECT count(DISTINCT user_id) FROM pilot_plans) published,(SELECT count(*) FROM pilot_feedback WHERE status='open') feedbackOpen,(SELECT count(*) FROM pilot_orders WHERE status IN ('requesting','reconciliation')) reconciliation"),members:await all("SELECT id,name,phone,active,clinician_id FROM pilot_users WHERE role='member'"),clinicians:await all("SELECT id,name FROM pilot_users WHERE role='clinician' AND active=1"),orders:(await all("SELECT * FROM pilot_orders WHERE status IN ('reconciliation','requesting')")).map(paymentView),feedback:await all('SELECT f.id,f.user_id,f.kind,f.message,f.status,f.reply,u.name FROM pilot_feedback f JOIN pilot_users u ON u.id=f.user_id ORDER BY f.created_at DESC')});
    }
    if(path==='staff/handoff'&&request.method==='POST') {
      role('clinician');const uid=text(body.userId,80);await clinical(uid);const r=await record(uid);
      if(r.status!=='published')throw new PilotError('INVALID_STATE',409);
      if(!r.coordination_consent)throw new PilotError('COORDINATION_CONSENT_REQUIRED',422);
      const p=await one('SELECT * FROM pilot_plans WHERE user_id=? ORDER BY version DESC LIMIT 1',uid);
      if(!p)throw new PilotError('PLAN_REQUIRED',409);
      const tasks=teamTasks(uid,p.id,parse(p.actions),parse(r.profile).city||'');if(tasks.length)await db.batch(tasks);
      await audit(user.id,uid,'plan_handed_to_coordination',p.id);return json({ok:true});
    }
    if(path==='staff/review'&&request.method==='POST') {
      role('clinician');const uid=text(body.userId,80);await clinical(uid);const r=await record(uid);
      if(r.version!==Number(body.version))throw new PilotError('VERSION_CONFLICT',409);
      if(body.action==='resolve_urgent') {
        const note=text(body.note,1000);if(note.length<10)throw new PilotError('REVIEW_NOTE_REQUIRED',422);
        if(!r.urgent||r.urgent_resolved_at)throw new PilotError('INVALID_STATE',409);
        const resolvedAt=now();
        const [changed]=await db.batch([
          q('UPDATE pilot_records SET urgent_resolved_at=?,version=version+1,updated_at=? WHERE user_id=? AND version=? AND urgent=1 AND urgent_resolved_at IS NULL',resolvedAt,resolvedAt,uid,r.version),
          q("UPDATE pilot_tasks SET status='resolved',note=?,assigned_to=?,updated_at=? WHERE user_id=? AND kind='urgent' AND status='open' AND EXISTS(SELECT 1 FROM pilot_records WHERE user_id=? AND urgent_resolved_at=? AND version=?)",note,user.id,resolvedAt,uid,uid,resolvedAt,r.version+1),
        ]);
        if(!changed.meta.changes)throw new PilotError('VERSION_CONFLICT',409);
      } else if(body.action==='reopen') {
        const note=text(body.note,1000);if(note.length<10)throw new PilotError('REVIEW_NOTE_REQUIRED',422);
        const changed=await run("UPDATE pilot_records SET status='needs_information',information_request=?,version=version+1,updated_at=? WHERE user_id=? AND version=? AND status='published'",note,now(),uid,r.version);
        if(!changed.meta.changes)throw new PilotError('VERSION_CONFLICT',409);
      } else if(body.action==='request_information') {
        const note=text(body.note,1000);if(note.length<5)throw new PilotError('REVIEW_NOTE_REQUIRED',422);
        const changed=await run("UPDATE pilot_records SET status='needs_information',information_request=?,version=version+1,updated_at=? WHERE user_id=? AND version=? AND status='submitted'",note,now(),uid,r.version);if(!changed.meta.changes)throw new PilotError('VERSION_CONFLICT',409);
      } else if(body.action==='publish') {
        if(r.status!=='submitted'||(r.urgent&&!r.urgent_resolved_at))throw new PilotError('INVALID_STATE',409);
        const summary=text(body.summary,4000),actions=validateActions(body.actions);if(actions.some(a=>a.owner==='team')&&!r.coordination_consent)throw new PilotError('COORDINATION_CONSENT_REQUIRED',422);if(summary.length<20)throw new PilotError('INVALID_PLAN',422);
        const last=await one('SELECT max(version) v FROM pilot_plans WHERE user_id=?',uid),pid=id();
        // Conditional insert plus unique record/version indexes prevent concurrent publication.
        const results=await db.batch([
          q("INSERT INTO pilot_plans SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pilot_records WHERE user_id=? AND version=? AND status='submitted' AND (urgent=0 OR urgent_resolved_at IS NOT NULL))",pid,uid,(last?.v||0)+1,user.id,r.version,JSON.stringify({profile:parse(r.profile),answers:parse(r.answers),consentVersion:r.consent_version}),summary,JSON.stringify(actions),now(),uid,r.version),
          q("UPDATE pilot_records SET status='published',version=version+1,updated_at=? WHERE user_id=? AND version=? AND status='submitted' AND EXISTS(SELECT 1 FROM pilot_plans WHERE id=?)",now(),uid,r.version,pid),
          q("UPDATE pilot_tasks SET status='cancelled',note='با انتشار نسخه جدید برنامه جایگزین شد.',updated_at=? WHERE id IN (SELECT task_id FROM pilot_task_actions WHERE plan_id IN (SELECT id FROM pilot_plans WHERE user_id=? AND id!=?)) AND status IN ('requested','contacted','confirmed') AND EXISTS(SELECT 1 FROM pilot_plans WHERE id=?)",now(),uid,pid,pid),
          ...teamTasks(uid,pid,actions,parse(r.profile).city||''),
        ]);
        if(!results[0].meta.changes||!results[1].meta.changes)throw new PilotError('VERSION_CONFLICT',409);
      } else throw new PilotError('INVALID_ACTION');
      await audit(user.id,uid,`clinical_${body.action}`);return json({ok:true});
    }
    if(path==='actions'&&request.method==='POST') {
      role('member');const p=await one('SELECT * FROM pilot_plans WHERE user_id=? ORDER BY version DESC LIMIT 1',user.id);if(!p||p.id!==body.planId||!(parse(p.actions) as Action[]).some(a=>a.id===body.actionId&&a.owner==='member'))throw new PilotError('NOT_FOUND',404);
      if(typeof body.done!=='boolean')throw new PilotError('INVALID_STATE');await run('INSERT INTO pilot_action_updates VALUES (?,?,?,?,?,?,?)',id(),user.id,p.id,body.actionId,body.done?1:0,text(body.evidence,400),now());return json({ok:true});
    }
    if(path==='booking'&&request.method==='POST') {
      role('member');const r=await record(user.id);if(!r.coordination_consent||!body.consent)throw new PilotError('COORDINATION_CONSENT_REQUIRED',422);
      if(body.homeVisit&&c.mode!=='demo')throw new PilotError('LOCATION_DEMO_ONLY',422);
      const location=body.homeVisit?cleanLocation(body.location):null;
      const title=text(body.title,160),preferred=text(body.preferred,300);if(title.length<3||preferred.length<3)throw new PilotError('INVALID_BOOKING',422);
      if(!await one('SELECT id FROM pilot_plans WHERE user_id=?',user.id))throw new PilotError('PLAN_REQUIRED',409);
      await limit(`booking:${user.id}`,3,86400000);const taskId=id();const statements=[db.prepare('INSERT INTO pilot_tasks(id,user_id,kind,status,title,preferred,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(taskId,user.id,'booking','requested',title,preferred,now(),now())];
      if(location)statements.push(db.prepare('INSERT INTO pilot_booking_locations(task_id,address,unit,entrance,latitude,longitude,confirmed_at) VALUES (?,?,?,?,?,?,?)').bind(taskId,location.address,location.unit,location.entrance,location.latitude===null?null:String(location.latitude),location.longitude===null?null:String(location.longitude),now()));
      await db.batch(statements);await audit(user.id,user.id,'booking_consent');return json({ok:true});
    }
    if(path==='staff/booking'&&request.method==='POST') {
      role('coordinator');const t=await one("SELECT * FROM pilot_tasks WHERE id=? AND kind='booking'",text(body.id,80));if(!t)throw new PilotError('NOT_FOUND',404);
      const transitions:Record<string,string[]>={requested:['contacted','cancelled'],contacted:['confirmed','cancelled'],confirmed:['completed','cancelled']};
      if(!transitions[t.status]?.includes(body.status))throw new PilotError('INVALID_STATE',409);
      const provider=text(body.provider,160),scheduled=text(body.scheduledAt,80),reference=text(body.reference,120),note=text(body.note,600);
      if(body.status==='confirmed'&&(!provider||!scheduled||!reference||!body.centerConsent))throw new PilotError('BOOKING_CONFIRMATION_REQUIRED',422);
      const updates=[db.prepare('UPDATE pilot_tasks SET status=?,provider=?,scheduled_at=?,reference=?,note=?,assigned_to=?,updated_at=? WHERE id=? AND status=?').bind(body.status,provider||t.provider,scheduled||t.scheduled_at,reference||t.reference,note,user.id,now(),t.id,t.status)];
      if(body.status==='completed') updates.unshift(q("INSERT INTO pilot_action_updates(id,user_id,plan_id,action_id,done,evidence,created_at) SELECT ?,t.user_id,ta.plan_id,ta.action_id,1,?,? FROM pilot_tasks t JOIN pilot_task_actions ta ON ta.task_id=t.id WHERE t.id=? AND t.status='confirmed'",id(),`تأیید کارشناس: ${note||'انجام هماهنگی ثبت شد.'}`,now(),t.id));
      if(['completed','cancelled'].includes(body.status))updates.push(db.prepare("UPDATE pilot_booking_locations SET latitude=NULL,longitude=NULL WHERE task_id=? AND EXISTS (SELECT 1 FROM pilot_tasks WHERE id=? AND status IN ('completed','cancelled'))").bind(t.id,t.id));
      const results=await db.batch(updates);const changed=results[body.status==='completed'?1:0];
      if(!changed.meta.changes)throw new PilotError('VERSION_CONFLICT',409);await audit(user.id,t.user_id,body.status==='confirmed'?'booking_confirmed_with_consent':`booking_${body.status}`,t.id);return json({ok:true});
    }
    if(path==='feedback'&&request.method==='POST') {
      role('member');if(!['issue','suggestion','export','deletion','refund'].includes(body.kind)||text(body.message,2000).length<5)throw new PilotError('INVALID_FEEDBACK',422);
      await limit(`feedback:${user.id}`,10,86400000);await run('INSERT INTO pilot_feedback VALUES (?,?,?,?,?,?,?,?,?)',id(),user.id,body.kind,text(body.message,2000),text(body.page,80),'open',null,now(),now());return json({ok:true});
    }
    if(path==='staff/feedback'&&request.method==='POST') {
      role('admin');const reply=text(body.reply,1500);if(reply.length<5)throw new PilotError('INVALID_FEEDBACK',422);
      const feedback=await one('SELECT id,kind FROM pilot_feedback WHERE id=?',text(body.id,80));if(!feedback)throw new PilotError('NOT_FOUND',404);
      if(body.resolved===true&&!['issue','suggestion'].includes(feedback.kind))throw new PilotError('MANUAL_FULFILLMENT_REQUIRED',409);
      await run('UPDATE pilot_feedback SET reply=?,status=?,updated_at=? WHERE id=?',reply,body.resolved===true?'resolved':'open',now(),text(body.id,80));await audit(user.id,'','support_replied',text(body.id,80));return json({ok:true});
    }
    if(path==='staff/invite'&&request.method==='POST') {
      role('admin');const phone=phoneNumber(body.phone),name=text(body.name,140),doctor=text(body.clinicianId,80);if(!name||!await one("SELECT id FROM pilot_users WHERE id=? AND role='clinician' AND active=1",doctor))throw new PilotError('INVALID_INVITATION',422);
      if(await one('SELECT id FROM pilot_users WHERE phone=?',phone))throw new PilotError('INVITATION_EXISTS',409);
      const changed=await run("INSERT INTO pilot_users(id,phone,name,role,clinician_id,created_at) SELECT ?,?,?,'member',?,? WHERE (SELECT count(*) FROM pilot_users WHERE role='member' AND active=1)<50",id(),phone,name,doctor,now());
      if(!changed.meta.changes)throw new PilotError('PILOT_FULL',409);await audit(user.id,'','member_invited');return json({ok:true});
    }
    if(path==='staff/member'&&request.method==='POST') {
      role('admin');const uid=text(body.id,80),doctor=text(body.clinicianId,80);
      if(typeof body.active!=='boolean'||!await one("SELECT id FROM pilot_users WHERE id=? AND role='clinician' AND active=1",doctor))throw new PilotError('INVALID_INVITATION',422);
      const changed=await run("UPDATE pilot_users SET active=?,clinician_id=? WHERE id=? AND role='member' AND (?=0 OR active=1 OR (SELECT count(*) FROM pilot_users WHERE role='member' AND active=1)<50)",body.active?1:0,doctor,uid,body.active?1:0);
      if(!changed.meta.changes)throw new PilotError('PILOT_FULL',409);
      if(!body.active)await run('DELETE FROM pilot_sessions WHERE user_id=?',uid);
      await audit(user.id,uid,body.active?'member_assigned':'member_suspended');return json({ok:true});
    }
    throw new PilotError('NOT_FOUND',404);
  } catch(e) {
    if(e instanceof PilotError)return json({error:e.code,details:e.details},e.status);
    if(String(e).includes('UNIQUE constraint'))return json({error:'VERSION_CONFLICT'},409);
    // No request body, phone, clinical text, tokens, or provider response goes to logs.
    console.error('pilot request failed',path,e instanceof Error?e.name:'UnknownError');
    return json({error:'SERVICE_UNAVAILABLE'},503);
  }
}
