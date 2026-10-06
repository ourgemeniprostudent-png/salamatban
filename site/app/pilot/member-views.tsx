'use client';

import { type ReactNode, type CSSProperties } from 'react';
import { assessmentDefinition, type AssessmentQuestion } from '@/lib/assessment-definition';
import { labels } from '@/lib/pilot/domain';
import { Icon } from './brand';
import { DocumentUpload, type UploadProgress } from './document-upload';

// These presentation views consume the same validated API records as the pilot shell.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>;
type Navigate = (view: string) => void;
type OverviewProps = { data: Obj; onNavigate: Navigate };
const fa = (value: number) => value.toLocaleString('fa-IR');

function displayDate(value: string | number | undefined | null) {
  if (!value) return 'ثبت نشده';
  const parsed = new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function hasAnswer(value: unknown) {
  return Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
}

function completion(data: Obj) {
  const profile = data.record?.profile || {};
  const answers = data.record?.answers || {};
  const required = assessmentDefinition.questions.filter(question => question.required);
  const profileFields = ['firstName', 'lastName', 'birthDate', 'city', 'insurance', 'goal'];
  const total = required.length + profileFields.length + 1;
  const done = required.filter(question => hasAnswer(answers[question.id])).length
    + profileFields.filter(key => hasAnswer(profile[key])).length + Number(!!data.record?.consent_at);
  return { total, done, percent: Math.round(done / total * 100) };
}

function planActions(data: Obj) {
  const plan = data.plans?.[0];
  const today = new Date().toLocaleDateString('en-CA');
  return (plan?.actions || []).map((action: Obj) => {
    const changes = (data.updates || []).filter((update: Obj) => update.plan_id === plan.id && update.action_id === action.id);
    const latest = changes.at(-1);
    const done = !!latest?.done;
    return { ...action, done, completedAt: done ? latest.created_at : null, overdue: !done && action.due < today };
  });
}

function Status({ value }: { value: string }) {
  return <span className={`mv-status mv-status-${value}`}>{labels[value] || value}</span>;
}

function SectionHead({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="mv-section-head"><div className="mv-section-title"><span className="mv-section-icon"><Icon name={icon} size={20}/></span><div><h2>{title}</h2>{text && <p>{text}</p>}</div></div>{action}</div>;
}

function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return <div className="mv-empty"><span className="mv-empty-icon"><Icon name={icon} size={28}/></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="mv-text-link" onClick={onClick}>{children}<Icon name="arrow" size={16}/></button>;
}

function JourneySteps({ data }: { data: Obj }) {
  const complete = completion(data);
  const hasPlan = !!data.plans?.length;
  const submitted = !!data.record?.submitted_at;
  const stages = [
    { title: 'تکمیل پرونده', detail: complete.percent === 100 ? 'اطلاعات اولیه ثبت شده' : `${fa(complete.percent)}٪ از اطلاعات ثبت شده`, done: complete.percent === 100, active: !submitted && complete.percent < 100, icon: 'file' },
    { title: 'بررسی پزشک', detail: hasPlan ? 'جمع‌بندی منتشر شده' : submitted ? 'پرونده در صف بررسی' : 'پس از ارسال پرونده', done: hasPlan, active: submitted && !hasPlan, icon: 'doctor' },
    { title: 'برنامه اختصاصی', detail: hasPlan ? `نسخه ${fa(data.plans[0].version)} آماده است` : 'با تأیید پزشک شما', done: hasPlan, active: hasPlan, icon: 'route' },
    { title: 'پیگیری و همراهی', detail: data.tasks?.length ? `${fa(data.tasks.length)} درخواست هماهنگی` : 'قدم‌به‌قدم کنار شما', done: false, active: hasPlan, icon: 'heart' },
  ];
  return <ol className="mv-journey">{stages.map((stage, index) => <li key={stage.title} className={`${stage.done ? 'is-done' : ''} ${stage.active ? 'is-active' : ''}`}><span className="mv-journey-node"><Icon name={stage.done ? 'check' : stage.icon} size={21}/></span><span className="mv-journey-content"><span className="mv-step-number">گام {fa(index + 1)}</span><strong>{stage.title}</strong><small>{stage.detail}</small></span></li>)}</ol>;
}

export function HomeOverview({ data, profile, onNavigate }: OverviewProps & { profile: Obj }) {
  const plan = data.plans?.[0];
  const record = data.record || {};
  const progress = completion(data);
  const actions = planActions(data);
  const completed = actions.filter((action: Obj) => action.done).length;
  const tasks = (data.tasks || []).filter((task: Obj) => !['cancelled', 'completed'].includes(task.status));
  const submitted = record.status === 'submitted';
  const needsInformation = record.status === 'needs_information';
  const actionTitle = plan ? 'برنامه شما آماده است؛ قدم بعدی را بردارید.' : needsInformation ? 'یک قدم تا تکمیل پرونده شما مانده است.' : submitted ? 'پرونده شما به دست پزشک رسیده است.' : 'سلامتی، با یک قدم کوچک شروع می‌شود.';
  return <div className="mv-view mv-home">
    <div className="mv-home-lead"><span className="mv-soft-caption"><Icon name="sun" size={18}/>همراه شما، برای روزهای سالم‌تر</span><p>{profile.firstName ? `${profile.firstName} عزیز، ` : ''}اینجا مسیر سلامت خود را یک‌جا می‌بینید.</p></div>
    <section className="mv-welcome-card">
      <div className="mv-welcome-content"><span className="mv-hero-label"><span/>قدم بعدی شما</span><h2>{actionTitle}</h2><p>{record.information_request || (plan ? 'جمع‌بندی پزشک را بخوانید، اقدام‌های پیشنهادی را ببینید و پیشرفت خود را در همین‌جا ثبت کنید.' : submitted ? 'پزشک مسئول، پاسخ‌ها و مدارک شما را بررسی می‌کند و نتیجه در تصویر سلامت و برنامه پیگیری قرار می‌گیرد. زمان پاسخ قطعی هنوز اعلام نشده است؛ برای پیگیری از پشتیبانی اقدام کنید.' : 'از شناخت بهتر خود شروع کنید. سوابق، سبک زندگی و مدارک خود را ثبت کنید تا پزشک برنامه پیگیری شما را آماده کند.')}</p><div className="mv-hero-actions"><button className="mv-hero-button" onClick={() => onNavigate(plan ? 'plan' : submitted ? 'health' : 'intake')}>{plan ? 'مشاهده برنامه سلامت' : submitted ? 'مشاهده پرونده سلامت' : needsInformation ? 'تکمیل اطلاعات پرونده' : progress.done ? 'ادامه تکمیل پرونده' : 'شروع پرونده سلامت'}<Icon name="arrow" size={19}/></button><span><Icon name="shield" size={16}/>بررسی با مسئولیت پزشک</span></div></div>
      <div className="mv-welcome-visual" aria-hidden="true"><div className="mv-visual-orbit mv-visual-orbit-one"/><div className="mv-visual-orbit mv-visual-orbit-two"/><div className="mv-health-symbol"><Icon name="heart" size={58}/><span className="mv-symbol-plus">+</span></div><div className="mv-floating-note mv-floating-note-top"><span><Icon name="shield" size={18}/></span><div><strong>پرونده سلامت شما</strong><small>{labels[record.status] || 'در حال تشکیل'}</small></div></div><div className="mv-floating-note mv-floating-note-bottom"><span><Icon name="check" size={18}/></span><div><strong>همراهی در هر قدم</strong><small>از شناخت تا پیگیری</small></div></div></div>
    </section>
    <div className="mv-metrics">
      <button className="mv-metric" onClick={() => onNavigate('intake')}><span className="mv-metric-icon is-blue"><Icon name="file" size={22}/></span><span className="mv-metric-body"><span>تکمیل اطلاعات</span><strong>{fa(progress.percent)}<small>٪</small></strong><span className="mv-mini-progress"><span style={{ width: `${progress.percent}%` }}/></span></span><Icon name="chevron" size={15}/></button>
      <button className="mv-metric" onClick={() => onNavigate('documents')}><span className="mv-metric-icon is-teal"><Icon name="upload" size={22}/></span><span className="mv-metric-body"><span>مدارک سلامت</span><strong>{fa(data.files?.length || 0)}<small>مدرک</small></strong><small>در پرونده شما</small></span><Icon name="chevron" size={15}/></button>
      <button className="mv-metric" onClick={() => onNavigate('plan')}><span className="mv-metric-icon is-violet"><Icon name="route" size={22}/></span><span className="mv-metric-body"><span>اقدام‌های انجام‌شده</span><strong>{fa(completed)}<small>از {fa(actions.length)} اقدام</small></strong><small>{plan ? 'بر اساس گزارش شما' : 'پس از انتشار برنامه'}</small></span><Icon name="chevron" size={15}/></button>
      <button className="mv-metric" onClick={() => onNavigate('appointments')}><span className="mv-metric-icon is-amber"><Icon name="calendar" size={22}/></span><span className="mv-metric-body"><span>هماهنگی‌های فعال</span><strong>{fa(tasks.length)}<small>درخواست</small></strong><small>نوبت و خدمات سلامت</small></span><Icon name="chevron" size={15}/></button>
    </div>
    <section className="mv-card"><SectionHead icon="route" title="مسیر همراهی شما" text="از تشکیل پرونده تا پیگیری برنامه سلامت"/><JourneySteps data={data}/></section>
    <div className="mv-home-bottom">
      <section className="mv-card"><SectionHead icon="calendar" title="نوبت‌ها و هماهنگی‌ها" action={<TextLink onClick={() => onNavigate('appointments')}>مشاهده همه</TextLink>}/>{tasks.length ? <div className="mv-task-preview-list">{tasks.slice(0, 3).map((task: Obj) => <div className="mv-task-preview" key={task.id}><span className="mv-task-icon"><Icon name="calendar" size={22}/></span><div><h3>{task.title}</h3><p>{task.provider || 'در انتظار تعیین مرکز'}{task.scheduled_at ? ` · ${task.scheduled_at}` : ''}</p><Status value={task.status}/></div></div>)}</div> : <EmptyState icon="calendar" title="هماهنگی فعالی ندارید" text="پس از دریافت برنامه، برای هماهنگی خدمات و نوبت از کارشناس کمک بگیرید." action={<TextLink onClick={() => onNavigate('appointments')}>بخش هماهنگی نوبت</TextLink>}/>}</section>
      <section className="mv-card mv-companion-card"><span className="mv-companion-illustration" aria-hidden="true"><Icon name="help" size={40}/><span/><i/></span><span className="mv-soft-caption">در این مسیر تنها نیستید</span><h2>سؤالی دارید؟<br/>ما کنار شما هستیم.</h2><p>برای راهنمایی استفاده از سامانه، پیگیری پرونده یا ثبت درخواست، با تیم پشتیبانی در ارتباط باشید.</p><button className="mv-outline-button" onClick={() => onNavigate('support')}><Icon name="help" size={18}/>ارتباط با پشتیبانی<Icon name="arrow" size={17}/></button><small>برای وضعیت اورژانسی با ۱۱۵ تماس بگیرید.</small></section>
    </div>
  </div>;
}

function AnswerValue({ question, value }: { question: AssessmentQuestion; value: unknown }) {
  if (!hasAnswer(value)) return <span className="mv-unanswered">ثبت نشده</span>;
  const values = Array.isArray(value) ? value : [value];
  return <>{values.map((item: string) => question.options?.find(option => option.value === item)?.label || ({ yes: 'بله', no: 'خیر' } as Record<string, string>)[item] || String(item)).join('، ')}</>;
}

export function HealthOverview({ data, onNavigate }: OverviewProps) {
  const record = data.record || {};
  const answers = record.answers || {};
  const plan = data.plans?.[0];
  const sections = [
    { id: 'history', title: 'سوابق و داروها', description: 'پیشینه سلامت ثبت‌شده توسط شما', icon: 'file' },
    { id: 'lifestyle', title: 'سبک زندگی', description: 'عادت‌های روزمره و تجربه شما', icon: 'heart' },
    { id: 'context', title: 'اطلاعات تکمیلی سلامت', description: 'زمینه‌های مؤثر در بررسی پزشک', icon: 'users' },
    { id: 'safety', title: 'پاسخ‌های غربالگری اولیه', description: 'پاسخ‌های زمان تکمیل پرونده؛ نه وضعیت لحظه‌ای', icon: 'shield' },
  ];
  return <div className="mv-view"><div className="mv-info-banner"><span><Icon name="heart" size={22}/></span><div><strong>تصویری یک‌جا از اطلاعات سلامت شما</strong><p>اطلاعات این بخش از پاسخ‌های خودتان می‌آید. جمع‌بندی پزشک جداگانه نمایش داده می‌شود.</p></div><button className="mv-outline-button" onClick={() => onNavigate('intake')}>{['draft', 'needs_information'].includes(record.status) ? 'تکمیل اطلاعات' : 'مشاهده وضعیت پرونده'}<Icon name="arrow" size={16}/></button></div>
    <section className="mv-card mv-clinical-summary"><SectionHead icon="doctor" title="جمع‌بندی پزشک" text={plan ? `نسخه ${fa(plan.version)} · ${displayDate(plan.published_at)}` : 'پس از بررسی و تأیید پزشک مسئول'}/>{plan ? <><p className="mv-pre-wrap">{plan.summary}</p><div className="mv-doctor-signature"><span className="mv-avatar small"><Icon name="doctor" size={22}/></span><div><strong>{plan.reviewer}</strong><small>پزشک بررسی‌کننده پرونده</small></div><TextLink onClick={() => onNavigate('plan')}>برنامه و اقدام‌ها</TextLink></div></> : <EmptyState icon="doctor" title={record.status === 'submitted' ? 'پرونده در انتظار بررسی پزشک است' : 'جمع‌بندی هنوز منتشر نشده'} text="پس از تکمیل و ارسال پرونده، پزشک سوابق شما را بررسی می‌کند و نتیجه را در همین بخش می‌نویسد."/>}</section>
    {record.profile?.goal && <section className="mv-goal-card"><span className="mv-section-icon"><Icon name="route" size={23}/></span><div><span className="mv-soft-caption">هدف شما از همراهی</span><p>{record.profile.goal}</p></div></section>}
    <div className="mv-health-grid">{sections.map(section => <section className="mv-card" key={section.id}><SectionHead icon={section.icon} title={section.title} text={section.description}/><dl className="mv-answer-list">{assessmentDefinition.questions.filter(question => question.section === section.id).map(question => <div key={question.id}><dt>{question.label}</dt><dd><AnswerValue question={question as AssessmentQuestion} value={answers[question.id]}/></dd></div>)}</dl></section>)}</div>
  </div>;
}

export function DocumentsOverview({ data, fileList, onUpload, busy, locked }: { data: Obj; fileList: ReactNode; onUpload: (file: File, progress?:(p:UploadProgress)=>void) => Promise<void>; busy: boolean; locked: boolean }) {
 return <div className="mv-view"><section className="mv-card"><SectionHead icon="upload" title="افزودن مدرک سلامت" text="آزمایش، تصویر گزارش یا مستندات مرتبط با پرونده"/>{locked?<p>پرونده برای بررسی قفل است. برای افزودن مدرک از پشتیبانی کمک بگیرید.</p>:<DocumentUpload onUpload={onUpload} disabled={busy} count={data.files.length}/>}</section><section className="mv-card"><SectionHead icon="file" title="مدارک من" text={`${fa(data.files.length)} مدرک آماده دریافت و مشاهده`}/>{data.files.length?<div className="mv-files">{fileList}</div>:<EmptyState icon="file" title="جای مدارک شما اینجاست" text="نداشتن مدرک مانع تکمیل و ارسال پرونده نیست."/>}</section></div>;
}

export function AccountOverview({ data, user, onNavigate }: OverviewProps & { user: Obj }) {
  const record = data.record || {};
  const profile = record.profile || {};
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || user.name;
  const insurance = { none: 'بدون بیمه', basic: 'بیمه پایه', basic_plus: 'بیمه پایه و تکمیلی', unknown: 'مشخص نشده' } as Record<string, string>;
  return <div className="mv-view"><section className="mv-profile-card"><span className="mv-profile-avatar">{String(profile.firstName || user.name || 'س').slice(0, 1)}<span><Icon name="check" size={13}/></span></span><div><span className="mv-soft-caption">حساب شخصی سلامت‌بان</span><h2>{name}</h2><p><Icon name="phone" size={15}/><bdi>{user.phone}</bdi><span className="mv-profile-divider"/>{profile.city || 'شهر ثبت نشده'}</p></div><button className="mv-outline-button" onClick={() => onNavigate('intake')}>{['draft', 'needs_information'].includes(record.status) ? 'تکمیل مشخصات' : 'وضعیت پرونده'}<Icon name="arrow" size={16}/></button></section>
    <div className="mv-account-grid"><section className="mv-card"><SectionHead icon="users" title="مشخصات فردی" text="اطلاعات ثبت‌شده در پرونده شما"/><dl className="mv-profile-details">{[['نام', profile.firstName], ['نام خانوادگی', profile.lastName], ['تاریخ تولد', profile.birthDate ? displayDate(profile.birthDate) : ''], ['شهر', profile.city], ['پوشش بیمه', insurance[profile.insurance]], ['آخرین به‌روزرسانی پرونده', record.updated_at ? displayDate(record.updated_at) : '']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'ثبت نشده'}</dd></div>)}</dl></section>
      <section className="mv-card"><SectionHead icon="shield" title="رضایت‌ها و دسترسی‌ها" text="انتخاب‌های شما درباره استفاده از اطلاعات"/><div className="mv-consent-list"><div><span className={`mv-consent-symbol ${record.consent_at ? 'is-accepted' : ''}`}><Icon name={record.consent_at ? 'check' : 'clock'} size={20}/></span><div><h3>تشکیل پرونده و بررسی پزشک</h3><p>{record.consent_at ? `رضایت ثبت شده · ${displayDate(record.consent_at)}` : 'هنوز رضایت ثبت نشده است'}</p></div></div><div><span className={`mv-consent-symbol ${record.coordination_consent ? 'is-accepted' : ''}`}><Icon name={record.coordination_consent ? 'check' : 'clock'} size={20}/></span><div><h3>تماس برای هماهنگی نوبت</h3><p>{record.coordination_consent ? 'با تماس کارشناس موافقت کرده‌اید' : 'رضایت هماهنگی فعال نیست'}</p></div></div></div><p className="mv-consent-note">ارسال اطلاعات به مرکز درمانی، به رضایت جداگانه همان هماهنگی نیاز دارد.</p><TextLink onClick={() => onNavigate('support')}>درخواست تغییر رضایت یا دسترسی</TextLink></section>
    </div>
    <section className="mv-card"><SectionHead icon="file" title="پرداخت‌ها و رسیدها" text="سوابق پرداخت هزینه ارزیابی و برنامه"/>{data.orders?.length ? <div className="mv-payment-list">{data.orders.map((order: Obj) => <div className="mv-payment-row" key={order.id}><span className="mv-metric-icon is-blue"><Icon name="file" size={21}/></span><div><h3>ارزیابی و برنامه اولیه{order.mode === 'demo' && <small> · نمایشی</small>}</h3><p>{displayDate(order.createdAt)}{order.reference && <> · رسید <bdi>{order.reference}</bdi></>}</p></div><strong>{fa(Number(order.amountRial || 0) / 10)}<small>تومان</small></strong><Status value={order.status}/></div>)}</div> : <EmptyState icon="file" title="پرداختی ثبت نشده است" text="پس از تکمیل اطلاعات و مرور پرونده، مرحله پرداخت در دسترس قرار می‌گیرد."/>}</section>
    <section className="mv-card mv-data-controls"><div><h2>اطلاعات شما، درخواست شما</h2><p>برای دریافت نسخه‌ای از اطلاعات، درخواست حذف یا پیگیری پرداخت، از بخش پشتیبانی اقدام کنید. وضعیت درخواست تا رسیدگی نهایی قابل پیگیری است.</p></div><button className="mv-outline-button" onClick={() => onNavigate('support')}>ثبت درخواست پشتیبانی<Icon name="arrow" size={17}/></button></section>
  </div>;
}

export function JourneyTimeline({ data }: { data: Obj }) {
  const plan = data.plans?.[0];
  const actions = planActions(data);
  const done = actions.filter((action: Obj) => action.done).length;
  const percent = actions.length ? Math.round(done / actions.length * 100) : 0;
  const sorted = [...actions].sort((a, b) => String(a.due).localeCompare(String(b.due)));
  return <section className="mv-card mv-plan-timeline"><SectionHead icon="route" title="نقشه مسیر پیگیری" text={plan ? `اقدام‌های نسخه ${fa(plan.version)} برنامه پزشک` : 'پس از انتشار برنامه، قدم‌ها و موعدها اینجا قرار می‌گیرند'}/>{plan && actions.length ? <><div className="mv-plan-progress"><div className="mv-progress-ring" style={{ '--progress': `${percent}%` } as CSSProperties}><span>{fa(percent)}<small>٪</small></span></div><div><strong>{fa(done)} از {fa(actions.length)} اقدام انجام شده</strong><p>پیشرفت بر اساس گزارش شما از انجام اقدام‌ها محاسبه می‌شود.</p></div><span className="mv-plan-version">نسخه {fa(plan.version)}</span></div><ol className="mv-action-timeline">{sorted.map((action: Obj, index) => <li key={action.id} className={`${action.done ? 'is-done' : ''} ${action.overdue ? 'is-overdue' : ''}`}><span className="mv-timeline-node">{action.done ? <Icon name="check" size={17}/> : fa(index + 1)}</span><div className="mv-timeline-action"><div><span className="mv-timeline-date"><Icon name="calendar" size={14}/>{displayDate(action.due)}</span><span className={`mv-status ${action.done ? 'mv-status-completed' : action.overdue ? 'mv-status-needs_information' : 'mv-status-pending'}`}>{action.done ? 'انجام‌شده؛ گزارش شما' : action.overdue ? 'موعد گذشته' : 'در برنامه شما'}</span></div><h3>{action.title}</h3><p>{action.reason}</p><small>مسئول پیگیری: {action.owner === 'member' ? 'شما' : 'تیم همراهی'}{action.completedAt && ` · ثبت انجام: ${displayDate(action.completedAt)}`}</small></div></li>)}</ol></> : <EmptyState icon="route" title="هر قدم، در زمان خودش" text="پزشک پس از بررسی پرونده، اقدام‌های پیشنهادی و موعد هرکدام را مشخص می‌کند. برنامه منتشرشده در این مسیر نمایش داده می‌شود."/>}</section>;
}
