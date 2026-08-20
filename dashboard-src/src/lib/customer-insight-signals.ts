type CustomerSignalCall = {
  call_notes?: string | null;
  call_reason?: string | null;
  customer_response?: string | null;
  call_outcome?: string | null;
  next_action?: string | null;
};

type SignalDefinition = {
  label: string;
  terms: string[];
};

const CUSTOMER_INSIGHT_SIGNALS: SignalDefinition[] = [
  {
    label: "حساسية سعر",
    terms: ["سعر", "اسعار", "الاسعار", "غالي", "عالي", "عاليه", "تكلفة", "تكلفه", "عرض سعر"],
  },
  {
    label: "طلب خصم",
    terms: ["خصم", "تخفيض", "عرض خاص", "اوفرك", "اوفر", "كوبون"],
  },
  {
    label: "نية طلب",
    terms: ["طلب", "اوردر", "اوردار", "عايز اطلب", "هيطلب", "شراء", "اشتري", "توريد"],
  },
  {
    label: "متابعة مطلوبة",
    terms: ["متابعة", "تابع", "ارجعله", "كلمه تاني", "اتصل تاني", "معاودة", "بكرة", "غدا"],
  },
  {
    label: "منافس مذكور",
    terms: ["منافس", "منافسين", "شركة تانية", "شركه تانيه", "مورد تاني", "سعر تاني"],
  },
  {
    label: "مشكلة توصيل",
    terms: ["توصيل", "دليفري", "تاخير", "تأخير", "اتأخر", "استلام", "شحنة", "شحنه"],
  },
  {
    label: "دفع أو ائتمان",
    terms: ["دفع", "كاش", "اجل", "آجل", "تحصيل", "فاتورة", "فاتوره", "رصيد", "مديونية", "مديونيه"],
  },
  {
    label: "احتياج مخزون",
    terms: ["مخزون", "ناقص", "خلص", "متوفر", "وفر", "توريد", "كمية", "كميه"],
  },
  {
    label: "ملاحظة جودة",
    terms: ["جودة", "جوده", "عيب", "تالف", "سيء", "وحش", "مرتجع", "استبدال"],
  },
];

function normalizeArabicText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FFa-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCallSearchText(call: CustomerSignalCall) {
  return normalizeArabicText(
    [call.call_notes, call.call_reason, call.customer_response, call.call_outcome, call.next_action]
      .filter(Boolean)
      .join(" "),
  );
}

export function getCustomerInsightSignals(calls: CustomerSignalCall[], limit = 8): Array<[string, number]> {
  const counts = new Map<string, number>();

  for (const call of calls) {
    const searchText = buildCallSearchText(call);
    if (!searchText) continue;

    for (const signal of CUSTOMER_INSIGHT_SIGNALS) {
      const hasSignal = signal.terms.some((term) => searchText.includes(normalizeArabicText(term)));
      if (hasSignal) counts.set(signal.label, (counts.get(signal.label) || 0) + 1);
    }
  }

  return CUSTOMER_INSIGHT_SIGNALS.map((signal) => [signal.label, counts.get(signal.label) || 0] as [string, number])
    .filter(([, count]) => count > 0)
    .slice(0, limit);
}
