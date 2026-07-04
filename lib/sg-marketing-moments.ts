// Singapore marketing calendar intelligence (D-REQ3). A static reference of
// recurring moments relevant to private education marketing in Singapore,
// used to time AI campaign and calendar suggestions. Windows are given as
// month ranges because exact dates shift year to year; the prompt receives
// today's date alongside these so the model reasons about what is coming up.

export type SgMarketingMoment = {
  id: string;
  name: string;
  // 1-12. A window may wrap the year end (startMonth > endMonth).
  startMonth: number;
  endMonth: number;
  relevance: string;
};

export const SG_MARKETING_MOMENTS: SgMarketingMoment[] = [
  {
    id: "jan-intake",
    name: "January intake",
    startMonth: 11,
    endMonth: 1,
    relevance: "Enrolment deadline window for the January intake; decision-stage content and campus visits peak in November to December.",
  },
  {
    id: "april-intake",
    name: "April intake",
    startMonth: 2,
    endMonth: 4,
    relevance: "Recruitment window for the April intake, often paired with post new year decision making by PRC families.",
  },
  {
    id: "july-intake",
    name: "July intake",
    startMonth: 5,
    endMonth: 7,
    relevance: "Recruitment window for the July intake; overlaps school holiday research time for parents.",
  },
  {
    id: "october-intake",
    name: "October intake",
    startMonth: 8,
    endMonth: 10,
    relevance: "Recruitment window for the October intake; adult learners often plan year-end upskilling here.",
  },
  {
    id: "o-a-level-results",
    name: "O and A Level results season",
    startMonth: 1,
    endMonth: 2,
    relevance: "Results release period; students and parents actively compare pathways and private college options.",
  },
  {
    id: "cny",
    name: "Chinese New Year",
    startMonth: 1,
    endMonth: 2,
    relevance: "Family gathering season; education decisions are discussed at home, and Chinese-language content performs strongly.",
  },
  {
    id: "hari-raya",
    name: "Hari Raya Puasa",
    startMonth: 3,
    endMonth: 4,
    relevance: "Festive period; community-respectful scheduling and celebration content.",
  },
  {
    id: "mid-year-holidays",
    name: "June school holidays",
    startMonth: 6,
    endMonth: 6,
    relevance: "Students and parents have time for open houses, campus tours, and education fairs.",
  },
  {
    id: "national-day",
    name: "National Day",
    startMonth: 8,
    endMonth: 8,
    relevance: "Singapore pride moment; local proof points and community stories fit naturally.",
  },
  {
    id: "deepavali",
    name: "Deepavali",
    startMonth: 10,
    endMonth: 11,
    relevance: "Festive period; community-respectful scheduling and celebration content.",
  },
  {
    id: "eleven-eleven",
    name: "11.11 shopping season",
    startMonth: 11,
    endMonth: 11,
    relevance: "High promotional attention; short-course and early-bird fee promotions land well if kept factual.",
  },
  {
    id: "twelve-twelve-year-end",
    name: "12.12 and year-end holidays",
    startMonth: 12,
    endMonth: 12,
    relevance: "Year-end reflection and planning; adult learners set new year study goals, families plan for January intake.",
  },
  {
    id: "education-fairs",
    name: "Education fair seasons",
    startMonth: 2,
    endMonth: 3,
    relevance: "Major private education fairs typically cluster in February to March (and again around July); fair follow-up content converts well.",
  },
];

function monthInWindow(month: number, moment: SgMarketingMoment): boolean {
  if (moment.startMonth <= moment.endMonth) {
    return month >= moment.startMonth && month <= moment.endMonth;
  }

  // Window wraps the year end.
  return month >= moment.startMonth || month <= moment.endMonth;
}

// Moments whose window touches any of the next `monthsAhead` months,
// starting from the given date's month.
export function upcomingSgMoments(
  from: Date,
  monthsAhead = 6,
): SgMarketingMoment[] {
  const months: number[] = [];

  for (let offset = 0; offset < monthsAhead; offset += 1) {
    months.push(((from.getMonth() + offset) % 12) + 1);
  }

  return SG_MARKETING_MOMENTS.filter((moment) =>
    months.some((month) => monthInWindow(month, moment)),
  );
}

export type SgMomentNudge = {
  moment: SgMarketingMoment;
  // "open" when today's month falls inside the window, "upcoming" otherwise.
  status: "open" | "upcoming";
  // Whole days from today to the first day of the window's start month.
  // 0 while the window is open. Derived from the calendar, never invented.
  daysUntilOpen: number;
  message: string;
};

// Whole days from `from` (at local midnight) to the first day of the next
// occurrence of `startMonth`. Pure calendar arithmetic, no invented dates.
function daysUntilMonthStart(from: Date, startMonth: number): number {
  const fromMidnight = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
  );
  let target = new Date(from.getFullYear(), startMonth - 1, 1);
  if (target.getTime() < fromMidnight.getTime()) {
    target = new Date(from.getFullYear() + 1, startMonth - 1, 1);
  }
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - fromMidnight.getTime()) / dayMs);
}

// Dashboard nudges for real Singapore moments that are open now or open
// within `maxDaysAhead` days. Every figure is computed from `from`, so no
// dates are invented; windows already open report "open now".
export function sgMomentNudges(
  from: Date,
  maxDaysAhead = 120,
): SgMomentNudge[] {
  const month = from.getMonth() + 1;
  const nudges: SgMomentNudge[] = [];

  for (const moment of SG_MARKETING_MOMENTS) {
    if (monthInWindow(month, moment)) {
      nudges.push({
        moment,
        status: "open",
        daysUntilOpen: 0,
        message: `${moment.name} window is open now.`,
      });
      continue;
    }

    const days = daysUntilMonthStart(from, moment.startMonth);
    if (days > 0 && days <= maxDaysAhead) {
      nudges.push({
        moment,
        status: "upcoming",
        daysUntilOpen: days,
        message: `${moment.name} window opens in ${days} day${days === 1 ? "" : "s"}.`,
      });
    }
  }

  return nudges.sort((a, b) => a.daysUntilOpen - b.daysUntilOpen);
}
