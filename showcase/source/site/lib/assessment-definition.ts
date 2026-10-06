export type AssessmentQuestion = {
  id: string;
  section: 'safety' | 'context' | 'history' | 'lifestyle';
  label: string;
  help?: string;
  type: 'yes_no' | 'single' | 'multi' | 'text';
  options?: { value: string; label: string }[];
  required: boolean;
  redFlag?: boolean;
};

export const assessmentDefinition = {
  id: 'baseline-intake-2026-v1',
  version: '2026.1.0',
  title: 'ارزیابی پایه سلامت بزرگسالان',
  source: 'hamyar-salamat-clinical-screening-reference-2026-v1',
  approvedBy: 'Dr. Najmeh Shirafkan',
  approvedAt: Date.UTC(2026, 7, 25),
  questions: [
    { id:'urgent_chest_pain', section:'safety', label:'آیا اکنون درد یا فشار جدید در قفسه سینه دارید؟', type:'yes_no', required:true, redFlag:true },
    { id:'urgent_dyspnea', section:'safety', label:'آیا اکنون تنگی نفس جدید یا شدید دارید؟', type:'yes_no', required:true, redFlag:true },
    { id:'urgent_syncope', section:'safety', label:'آیا اخیراً بیهوشی یا سنکوپ داشته‌اید؟', type:'yes_no', required:true, redFlag:true },
    { id:'urgent_neuro', section:'safety', label:'آیا ضعف یک‌طرفه، اختلال ناگهانی گفتار یا علامت عصبی جدید دارید؟', type:'yes_no', required:true, redFlag:true },
    { id:'urgent_bleeding', section:'safety', label:'آیا خونریزی شدید یا کنترل‌نشده دارید؟', type:'yes_no', required:true, redFlag:true },
    { id:'urgent_infection', section:'safety', label:'آیا تب یا نشانه عفونت شدید همراه با بدحالی دارید؟', type:'yes_no', required:true, redFlag:true },
    { id:'urgent_self_harm', section:'safety', label:'آیا اکنون فکر آسیب‌زدن به خود یا دیگری دارید؟', type:'yes_no', required:true, redFlag:true },
    { id:'pregnancy_status', section:'context', label:'وضعیت بارداری یا قصد بارداری', type:'single', required:true, options:[
      {value:'not_applicable',label:'برای من مطرح نیست'}, {value:'not_pregnant',label:'باردار نیستم و قصد ۱۲ماهه ندارم'},
      {value:'planning',label:'قصد بارداری در ۱۲ ماه آینده دارم'}, {value:'pregnant',label:'باردار هستم'}, {value:'unsure',label:'مطمئن نیستم'}
    ]},
    { id:'known_conditions', section:'history', label:'بیماری‌های شناخته‌شده', help:'هر موردی که قبلاً توسط پزشک مطرح شده انتخاب کنید.', type:'multi', required:true, options:[
      {value:'none',label:'هیچ‌کدام'}, {value:'hypertension',label:'فشارخون'}, {value:'diabetes',label:'دیابت/پیش‌دیابت'},
      {value:'kidney',label:'بیماری کلیه'}, {value:'cardiovascular',label:'بیماری قلبی‌عروقی'}, {value:'cancer',label:'سرطان'},
      {value:'thalassemia',label:'تالاسمی'}, {value:'hemophilia',label:'هموفیلی'}, {value:'ms',label:'ام‌اس'}, {value:'other',label:'سایر'}
    ]},
    { id:'medications', section:'history', label:'داروها و مکمل‌های فعلی', help:'نام داروها را بنویسید؛ هیچ دارویی را خودسرانه قطع نکنید.', type:'text', required:false },
    { id:'allergies', section:'history', label:'حساسیت دارویی یا غذایی شناخته‌شده', type:'text', required:false },
    { id:'family_history', section:'history', label:'سابقه خانوادگی مهم', type:'multi', required:true, options:[
      {value:'none',label:'هیچ‌کدام/نمی‌دانم'}, {value:'early_cvd',label:'بیماری قلبی زودرس'}, {value:'diabetes',label:'دیابت'},
      {value:'kidney',label:'بیماری کلیه'}, {value:'cancer',label:'سرطان'}, {value:'genetic',label:'تالاسمی، هموفیلی یا بیماری ژنتیکی'}
    ]},
    { id:'tobacco', section:'lifestyle', label:'مصرف دخانیات', type:'single', required:true, options:[
      {value:'never',label:'هرگز'}, {value:'former',label:'قبلاً مصرف می‌کردم'}, {value:'current',label:'در حال حاضر مصرف می‌کنم'}, {value:'secondhand',label:'در معرض دود دیگران هستم'}
    ]},
    { id:'activity', section:'lifestyle', label:'فعالیت بدنی معمول شما', type:'single', required:true, options:[
      {value:'low',label:'کمتر از یک روز در هفته'}, {value:'some',label:'۱ تا ۲ روز در هفته'}, {value:'regular',label:'۳ روز یا بیشتر در هفته'}
    ]},
    { id:'sleep', section:'lifestyle', label:'کیفیت خواب در دو هفته اخیر', type:'single', required:true, options:[
      {value:'good',label:'خوب'}, {value:'mixed',label:'متغیر'}, {value:'poor',label:'ضعیف'}
    ]},
  ] satisfies AssessmentQuestion[],
} as const;

export const redFlagQuestionIds = new Set(assessmentDefinition.questions.filter((question) => question.redFlag).map((question) => question.id));
