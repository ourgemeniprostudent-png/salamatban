/** Wording follows affirmative answers, never a diagnosis or an inferred severity. */
export type UrgentPositiveQuestion = { id: string; label: string };
type Guidance = { spoken: string; waiting: string };

export const urgentGuidanceByQuestion: Readonly<Record<string, Guidance>> = {
  urgent_chest_pain: {
    spoken: 'درد یا فشار جدید در قفسهٔ سینه دارم.',
    waiting: 'درد یا فشار قفسهٔ سینه و هر تغییر آن را به اپراتور بگویید؛ برای اقدام بعدی از او راهنمایی بگیرید.',
  },
  urgent_dyspnea: {
    spoken: 'تنگی نفس جدید یا شدید دارم.',
    waiting: 'اگر حرف‌زدن یا نفس‌کشیدن دشوار است، همان ابتدا بگویید و اگر ممکن است از فردی مطمئن برای تماس کمک بخواهید.',
  },
  urgent_syncope: {
    spoken: 'اخیراً بیهوشی یا سنکوپ داشته‌ام.',
    waiting: 'بگویید بیهوشی چه زمانی رخ داده و اکنون هوشیار هستید یا نه؛ اگر نمی‌دانید، حدس نزنید.',
  },
  urgent_neuro: {
    spoken: 'یک علامت عصبی دارم؛ [دقیق بگویید: ضعف یک‌طرفه، اختلال ناگهانی گفتار یا علامت دیگری که دارید].',
    waiting: 'زمان شروع علامت یا آخرین زمانی را که حال عادی داشتید بگویید؛ خودتان رانندگی نکنید.',
  },
  urgent_bleeding: {
    spoken: 'خونریزی شدید یا کنترل‌نشده دارم.',
    waiting: 'محل خونریزی را بگویید و برای اقدام بعدی از اپراتور راهنمایی بگیرید.',
  },
  urgent_infection: {
    spoken: 'با تب یا نشانهٔ عفونت شدید، احساس بدحالی دارم.',
    waiting: 'تب یا نشانهٔ عفونت و بدحالی را توضیح دهید؛ دربارهٔ اقدام بعدی از اپراتور راهنمایی بگیرید.',
  },
  urgent_self_harm: {
    spoken: 'الان به آسیب‌زدن به خودم یا دیگری فکر می‌کنم و برای امن‌ماندن کمک می‌خواهم.',
    waiting: 'اگر امن است، تنها نمانید؛ از فردی مطمئن بخواهید کنار شما بماند و از وسایل خطرناک فاصله بگیرید.',
  },
};

export function buildUrgentGuidance(positiveQuestions: readonly UrgentPositiveQuestion[]) {
  const seen = new Set<string>();
  const questions = positiveQuestions.filter(question => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
  return {
    questions,
    spokenSymptoms: questions.map(question => urgentGuidanceByQuestion[question.id]?.spoken || `به پرسش «${question.label}» پاسخ بله داده‌ام؛ [علامت خودم را دقیق توضیح می‌دهم].`),
    waitingInstructions: questions.flatMap(question => urgentGuidanceByQuestion[question.id]?.waiting ? [{ id: question.id, text: urgentGuidanceByQuestion[question.id].waiting }] : []),
  };
}
