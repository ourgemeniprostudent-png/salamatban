import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../../../../db';
import { cleanText, getMemberByAuthUser } from '../../../../../lib/member';

export async function PATCH(request:Request,context:{params:Promise<{id:string}>}) {
  const user=await getAuthenticatedUser(); if(!user)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401});
  await ensureMvpSchema(); const member=await getMemberByAuthUser(user.userId); if(!member)return NextResponse.json({error:'ONBOARDING_REQUIRED'},{status:409});
  const {id}=await context.params; let body:{status?:unknown;evidence?:unknown}; try{body=await request.json() as typeof body;}catch{return NextResponse.json({error:'INVALID_JSON'},{status:400});}
  const status=cleanText(body.status,20),evidence=cleanText(body.evidence,300); if(!['pending','completed'].includes(status)||evidence.length<3)return NextResponse.json({error:'VALIDATION_FAILED'},{status:422});
  const action=await getD1().prepare(`SELECT ra.id FROM roadmap_actions ra JOIN roadmaps r ON r.id=ra.roadmap_id WHERE ra.id=? AND r.member_id=? AND r.status='active' LIMIT 1`).bind(id,member.id).first();
  if(!action)return NextResponse.json({error:'NOT_FOUND'},{status:404}); const now=Date.now();
  await getD1().batch([
    getD1().prepare('UPDATE roadmap_actions SET status=? WHERE id=?').bind(status,id),
    getD1().prepare('INSERT INTO roadmap_action_updates (id,action_id,member_id,status,evidence,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,member.id,status,evidence,now),
    getD1().prepare("INSERT INTO audit_events (id,actor_id,subject_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,?,'roadmap.action_updated','roadmap_action',?,'care_followup','success',?)").bind(crypto.randomUUID(),user.userId,member.id,id,now),
  ]); return NextResponse.json({ok:true,status});
}
