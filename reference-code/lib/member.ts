import { getD1 } from '../db';

export type MemberIdentity = { id:string; first_name:string; last_name:string; city:string };

export async function getMemberByAuthUser(authUserId:string) {
  return getD1().prepare('SELECT id,first_name,last_name,city FROM members WHERE auth_user_id=? LIMIT 1').bind(authUserId).first<MemberIdentity>();
}

export function cleanText(value:unknown,max:number) {
  return typeof value === 'string' ? value.trim().slice(0,max) : '';
}
