import { assessmentDefinition } from '../assessment-definition';
import { validateProfile, validDate, type Answer } from './domain';
export function stepErrors(step:number,profile:Record<string,unknown>,answers:Record<string,Answer>,consent:boolean):Record<string,string> {
 const errors:Record<string,string>={};
 if(step===0&&!consent)errors.consent='برای تشکیل پرونده، رضایت آگاهانه لازم است.';
 if(step===1){
  for(const [key,label] of [['firstName','نام'],['lastName','نام خانوادگی'],['city','شهر'],['goal','هدف شما از همراهی']])if(!String(profile[key]||'').trim())errors[key]=`${label} را وارد کنید.`;
  if(!validDate(String(profile.birthDate||'')))errors.birthDate='یک تاریخ تولد معتبر وارد کنید.';
  if(!['none','basic','basic_plus','unknown'].includes(String(profile.insurance)))errors.insurance='وضعیت بیمه را انتخاب کنید.';
  if(!errors.birthDate)try{validateProfile({...profile,firstName:'x',lastName:'x',city:'x',goal:'x',insurance:'none'});}catch{errors.birthDate='سن قابل پذیرش از ۱۸ تا ۱۱۹ سال است.';}
 }
 if(step===2||step===3)for(const q of assessmentDefinition.questions){if(q.required&&(step===2?q.section==='safety':q.section!=='safety')&&(!answers[q.id]||!answers[q.id].length))errors[q.id]='پاسخ این پرسش را انتخاب کنید.';}
 return errors;
}
