import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../chatgpt-auth';
import { ensureMvpSchema, getD1 } from '../../../db';
import { getMemberByAuthUser } from '../../../lib/member';

const allowed=new Set(['application/pdf','image/jpeg','image/png']);
export async function POST(request:Request){
  const user=await getAuthenticatedUser();if(!user)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401});await ensureMvpSchema();const member=await getMemberByAuthUser(user.userId);if(!member)return NextResponse.json({error:'ONBOARDING_REQUIRED'},{status:409});
  const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||!allowed.has(file.type)||file.size<1||file.size>900*1024)return NextResponse.json({error:'INVALID_FILE'},{status:422});
  const bytes=await file.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);const checksum=Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,'0')).join('');const id=crypto.randomUUID();const key=`members/${member.id}/quarantine/${id}`;await env.FILES.put(key,bytes,{httpMetadata:{contentType:file.type},customMetadata:{memberId:member.id,checksum}});const now=Date.now();
  await getD1().batch([getD1().prepare("INSERT INTO medical_documents (id,member_id,original_name,object_key,content_type,byte_size,checksum,status,created_at) VALUES (?,?,?,?,?,?,?,'quarantined',?)").bind(id,member.id,file.name.slice(0,180),key,file.type,file.size,checksum,now),getD1().prepare("INSERT INTO audit_events (id,actor_id,subject_id,action,resource_type,resource_id,purpose,outcome,created_at) VALUES (?,?,?,'document.uploaded','medical_document',?,'clinical_evidence','quarantined',?)").bind(crypto.randomUUID(),user.userId,member.id,id,now)]);
  return NextResponse.json({ok:true,id,status:'quarantined'});
}
