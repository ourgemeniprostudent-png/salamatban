import { assessmentDefinition, type AssessmentQuestion } from '../assessment-definition';
import { PilotError, text, type Answer } from './domain';
export function cleanAnswers(input:unknown, complete=false):Record<string,Answer> {
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new PilotError('INVALID_ANSWERS',422);
  const values=input as Record<string,unknown>, out:Record<string,Answer>={};
  for(const q of assessmentDefinition.questions as readonly AssessmentQuestion[]) {
    const v=values[q.id];
    if(v===undefined||v===''||(Array.isArray(v)&&!v.length)) { if(complete&&q.required)throw new PilotError('MISSING_ANSWER',422,{question:q.id}); continue; }
    if(q.type==='text') { if(typeof v!=='string')throw new PilotError('INVALID_ANSWERS',422);out[q.id]=text(v,1500); }
    else if(q.type==='multi') {
      if(!Array.isArray(v)||v.length>15||v.some(x=>typeof x!=='string'||!q.options?.some(o=>o.value===x))||(v.includes('none')&&v.length>1))throw new PilotError('INVALID_ANSWERS',422);
      out[q.id]=[...new Set(v)] as string[];
    } else {
      if(typeof v!=='string'||!(q.type==='yes_no'?['yes','no'].includes(v):q.options?.some(o=>o.value===v)))throw new PilotError('INVALID_ANSWERS',422);
      out[q.id]=v;
    }
  }
  return out;
}
export function isUrgent(answers:Record<string,Answer>) { return assessmentDefinition.questions.some(q=>q.redFlag&&answers[q.id]==='yes'); }
