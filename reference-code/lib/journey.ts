import { getD1 } from '../db';

export const journeySteps=[
  {number:1,label:'ورود امن',href:'/dashboard'},
  {number:2,label:'رضایت و پروفایل',href:'/start'},
  {number:3,label:'بسته ارزیابی',href:'/checkup'},
  {number:4,label:'رزرو خدمات',href:'/appointments'},
  {number:5,label:'نتایج',href:'/documents'},
  {number:6,label:'مرور بالینی',href:'/assessment'},
  {number:7,label:'تصویر سلامت',href:'/health-picture'},
  {number:8,label:'مسیر همراهی ۱۲ماهه',href:'/roadmap'},
  {number:9,label:'انتخاب همراهی',href:'/execution'},
  {number:10,label:'پرداخت اشتراک',href:'/assistance'},
  {number:11,label:'خانه سلامت',href:'/dashboard'},
];

export type JourneyState={assessment:boolean;checkup:boolean;appointment:boolean;document:boolean;reviewed:boolean;picture:boolean;roadmap:boolean;executionMode:string|null;subscription:boolean;completedThrough:number;nextHref:string;nextLabel:string};

export async function getJourneyState(memberId:string):Promise<JourneyState>{
  const row=await getD1().prepare(`SELECT
    EXISTS(SELECT 1 FROM questionnaire_responses WHERE member_id=?) assessment,
    EXISTS(SELECT 1 FROM checkup_orders WHERE member_id=? AND status='paid_test') checkup,
    EXISTS(SELECT 1 FROM appointments WHERE member_id=? AND status IN ('confirmed_test','handoff_test','manual_pending_test')) appointment,
    EXISTS(SELECT 1 FROM medical_documents WHERE member_id=? AND status IN ('quarantined','approved')) document,
    EXISTS(SELECT 1 FROM health_pictures WHERE member_id=?) reviewed,
    EXISTS(SELECT 1 FROM health_pictures WHERE member_id=? AND status='published') picture,
    EXISTS(SELECT 1 FROM roadmaps WHERE member_id=? AND status='active') roadmap,
    (SELECT mode FROM execution_preferences WHERE member_id=? LIMIT 1) execution_mode,
    EXISTS(SELECT 1 FROM subscriptions WHERE member_id=? AND status='active_test') subscription
  `).bind(memberId,memberId,memberId,memberId,memberId,memberId,memberId,memberId,memberId).first<Record<string,number|string|null>>();
  const assessment=Boolean(row?.assessment),checkup=Boolean(row?.checkup),appointment=Boolean(row?.appointment),document=Boolean(row?.document),reviewed=Boolean(row?.reviewed),picture=Boolean(row?.picture),roadmap=Boolean(row?.roadmap),executionMode=typeof row?.execution_mode==='string'?row.execution_mode:null,subscription=Boolean(row?.subscription);
  const complete=[true,true,assessment&&checkup,appointment,document,reviewed,picture,roadmap,Boolean(executionMode),executionMode==='self'||subscription];
  let completedThrough=0;for(const value of complete){if(value)completedThrough+=1;else break;}
  const next=journeySteps[Math.min(completedThrough,10)];
  return {assessment,checkup,appointment,document,reviewed,picture,roadmap,executionMode,subscription,completedThrough,nextHref:next.href,nextLabel:next.label};
}
