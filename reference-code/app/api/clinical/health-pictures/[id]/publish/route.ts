import { NextResponse } from 'next/server';
import { ensureMvpSchema, getD1 } from '../../../../../../db';
import { getClinicalReviewer } from '../../../../../../lib/clinical-access';

type RoadmapActionInput = { title?:string; rationale?:string; dueDate?:string; priority?:string; ownerType?:string; completionRule?:string };

const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
  const reviewer=await getClinicalReviewer(); if(!reviewer)return NextResponse.json({error:'CLINICAL_ACCESS_REQUIRED'},{status:403});
  const {id}=await context.params;
  let payload:{summary?:unknown;actions?:unknown}; try{payload=await request.json() as {summary?:unknown;actions?:unknown};}catch{return NextResponse.json({error:'INVALID_JSON'},{status:400});}
  const summary=clean(payload.summary,3000);
  if(summary.length<20||!Array.isArray(payload.actions)||payload.actions.length<1||payload.actions.length>6)return NextResponse.json({error:'VALIDATION_FAILED'},{status:422});
  const today=new Date(); today.setUTCHours(0,0,0,0); const lastDate=new Date(today.getTime()+400*24*60*60*1000);
  const actions=payload.actions.map((input:RoadmapActionInput)=>({title:clean(input.title,140),rationale:clean(input.rationale,500),dueDate:clean(input.dueDate,10),priority:clean(input.priority,12),ownerType:clean(input.ownerType,20),completionRule:clean(input.completionRule,300)}));
  const valid=actions.every((action)=>{const due=new Date(`${action.dueDate}T00:00:00Z`);return action.title.length>=3&&action.rationale.length>=5&&action.completionRule.length>=5&&!Number.isNaN(due.getTime())&&due>=today&&due<=lastDate&&['low','normal','high'].includes(action.priority)&&['member','care_team'].includes(action.ownerType);});
  if(!valid)return NextResponse.json({error:'INVALID_ROADMAP_ACTION'},{status:422});

  await ensureMvpSchema(); const db=getD1(); const picture=await db.prepare("SELECT id,member_id,status FROM health_pictures WHERE id=? LIMIT 1").bind(id).first<{id:string;member_id:string;status:string}>();
  if(!picture)return NextResponse.json({error:'NOT_FOUND'},{status:404}); if(picture.status!=='draft')return NextResponse.json({error:'ALREADY_PUBLISHED'},{status:409});
  const now=Date.now(); const latest=await db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM roadmaps WHERE member_id=?').bind(picture.member_id).first<{version:number}>(); const roadmapId=crypto.randomUUID();
  const statements=[
    db.prepare("UPDATE health_pictures SET summary=?,status='published',published_at=? WHERE id=? AND status='draft'").bind(summary,now,picture.id),
    db.prepare(`INSERT INTO roadmaps (id,member_id,health_picture_id,version,status,start_date,approved_by,published_at,created_at) VALUES (?,?,?,?,'active',?,?,?,?)`)
      .bind(roadmapId,picture.member_id,picture.id,(latest?.version??0)+1,today.toISOString().slice(0,10),reviewer.userId,now,now),
  ];
  for(const action of actions)statements.push(db.prepare(`INSERT INTO roadmap_actions (id,roadmap_id,title,rationale,due_date,priority,owner_type,status,completion_rule,created_at) VALUES (?,?,?,?,?,?,?,'pending',?,?)`).bind(crypto.randomUUID(),roadmapId,action.title,action.rationale,action.dueDate,action.priority,action.ownerType,action.completionRule,now));
  statements.push(db.prepare(`INSERT INTO audit_events (id,actor_id,subject_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,?,'roadmap.published','roadmap',?,'care_planning','success',?)`).bind(crypto.randomUUID(),reviewer.userId,picture.member_id,roadmapId,now));
  await db.batch(statements); return NextResponse.json({ok:true,roadmapId,status:'published'});
}
