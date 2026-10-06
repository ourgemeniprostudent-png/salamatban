import { env } from 'cloudflare:workers';
import { settings } from '@/lib/pilot/config';
import { handlePilot } from '@/lib/pilot/service';
const handler=async(request:Request)=>{try{return await handlePilot(request,{db:env.DB,files:env.FILES,c:settings()});}catch{return Response.json({error:'PILOT_NOT_READY'},{status:503,headers:{'Cache-Control':'no-store'}});}};
export const GET=handler;
export const POST=handler;
export const PUT=handler;
