export interface AssessmentResult {
  id: string;
  score: number;
  answers: Record<number, number>; // questionIndex (1-15) -> rating (1-5)
  category: string;
  summary: string;
  strengths: string[];
  growthOpportunities: string[];
  recommendation: string;
  timestamp: string;
}

export interface UserProfile {
  name: string;
  email: string;
  personalGoals: string;
  growthFocusAreas: string[];
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  intakeAnswers: {
    frustration: string;
    longestDelayed: string;
    fiveYearProjection: string;
    proudGoal: string;
    biggestObstacle: string;
    triedSolutions: string;
    whyNow: string;
  };
  slotDate: string;
  slotTime: string;
  bookingCode: string;
  timestamp: string;
}

export const SERVICES = [
  {
    id: "future-alignment",
    name: "Future Alignment Session",
    description: "A one-on-one deep dive focused on identifying the single biggest timeline gap between Present You and Future You.",
    benefits: [
      "Find where your current trajectory leads",
      "Isolate the single biggest growth obstacle",
      "Get a clear 3-step timeline course correction"
    ],
    duration: "60 Minutes",
    price: "$149"
  },
  {
    id: "timeline-upgrade",
    name: "Timeline Upgrade Program",
    description: "A comprehensive, structured coaching package designed to help clients build durable daily habits that future versions will appreciate.",
    benefits: [
      "8 weekly 1-on-1 accountability checks",
      "Custom habit-stacking tracking dashboard",
      "Direct texting access to Dr. Tomorrow"
    ],
    duration: "8 Weeks",
    price: "$999"
  },
  {
    id: "anti-procrastination",
    name: "Anti-Procrastination Intervention",
    description: "An intensive emergency intervention service for individuals whose Future Self has already filed multiple complaints.",
    benefits: [
      "Urgent system audit (find procrastination loops)",
      "Instant focus blocker tool installations",
      "Daily action checks to break the freeze response"
    ],
    duration: "30 Days",
    price: "$499"
  }
];

export const CATEGORIES = {
  CONCERNED: {
    title: "Future You Is Sending Concerned Emails",
    range: [15, 30] as [number, number],
    summary: "Future You has reviewed the situation, is pacing back and forth in their premium workspace, and would like to schedule an immediate intervention.",
    strengths: ["Still breathing", "Untapped potential detected", "Hope remains"],
    growthOpportunities: ["Consistency in daily execution", "Focusing on single priorities", "Goal clarity and specificity"],
    recommendation: "Start with just one meaningful, tiny daily habit and focus exclusively on building initial momentum."
  },
  OPTIMISTIC: {
    title: "Future You Is Cautiously Optimistic",
    range: [31, 50] as [number, number],
    summary: "Future You sees promise but has noticed several unfinished projects, abandoned plans, and questionable late-night decisions.",
    strengths: ["High self-awareness", "Strong ambition", "Desire for genuine growth"],
    growthOpportunities: ["Reliability and follow-through", "Accountability structures", "Moving from planning to execution"],
    recommendation: "Focus on building automatic systems and environments instead of relying on temporary motivation."
  },
  PROUD: {
    title: "Future You Is Proud",
    range: [51, 65] as [number, number],
    summary: "You are making excellent progress and building a solid, reliable foundation that future versions will thank you for.",
    strengths: ["Consistent self-discipline", "Clear focus on goals", "Proactive growth mindset"],
    growthOpportunities: ["Leverage and delegation", "Broader leadership impact", "Long-term legacy planning"],
    recommendation: "Identify the few high-impact actions (the 80/20 rule) that create the absolute biggest multiplier effects."
  },
  BRAGGING: {
    title: "Future You Is Bragging About You",
    range: [66, 75] as [number, number],
    summary: "Future You has become borderline unbearable at dinner parties because they cannot stop bragging about your achievements.",
    strengths: ["Outstanding consistency", "Total ownership of results", "Strategic, timeline-aware thinking"],
    growthOpportunities: ["Scaling your impact", "Mentoring others in growth", "Pursuing even more audacious goals"],
    recommendation: "Your next challenge is expansion and scaling your impact, rather than simple survival. Dream bigger."
  }
};

export function getCategoryByScore(score: number) {
  if (score <= 30) return CATEGORIES.CONCERNED;
  if (score <= 50) return CATEGORIES.OPTIMISTIC;
  if (score <= 65) return CATEGORIES.PROUD;
  return CATEGORIES.BRAGGING;
}

// Client-side helper checks
const isClient = () => typeof window !== "undefined";

export function getStoredResults(): AssessmentResult[] {
  if (!isClient()) return [];
  try {
    const data = localStorage.getItem("future_you_results");
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to read results", e);
    return [];
  }
}

export function saveAssessmentResult(result: Omit<AssessmentResult, "id" | "timestamp">): AssessmentResult {
  const newResult: AssessmentResult = {
    ...result,
    id: "res_" + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString()
  };
  
  if (!isClient()) return newResult;
  try {
    const existing = getStoredResults();
    const updated = [newResult, ...existing];
    localStorage.setItem("future_you_results", JSON.stringify(updated));
    return newResult;
  } catch (e) {
    console.error("Failed to save result", e);
    return newResult;
  }
}

export function getStoredProfile(): UserProfile | null {
  if (!isClient()) return null;
  try {
    const data = localStorage.getItem("future_you_profile");
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to read profile", e);
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (!isClient()) return;
  try {
    localStorage.setItem("future_you_profile", JSON.stringify(profile));
    // Trigger custom storage event for sync
    window.dispatchEvent(new Event("storage_profile_update"));
  } catch (e) {
    console.error("Failed to save profile", e);
  }
}

export function getStoredBookings(): Booking[] {
  if (!isClient()) return [];
  try {
    const data = localStorage.getItem("future_you_bookings");
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to read bookings", e);
    return [];
  }
}

export function saveBooking(booking: Omit<Booking, "id" | "bookingCode" | "timestamp">): Booking {
  const newBooking: Booking = {
    ...booking,
    id: "bk_" + Math.random().toString(36).substring(2, 9),
    bookingCode: "FT-" + Math.floor(100000 + Math.random() * 90000).toString(),
    timestamp: new Date().toISOString()
  };
  
  if (!isClient()) return newBooking;
  try {
    const existing = getStoredBookings();
    const updated = [newBooking, ...existing];
    localStorage.setItem("future_you_bookings", JSON.stringify(updated));
    return newBooking;
  } catch (e) {
    console.error("Failed to save booking", e);
    return newBooking;
  }
}

export function clearAllData(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem("future_you_results");
    localStorage.removeItem("future_you_profile");
    localStorage.removeItem("future_you_bookings");
    window.dispatchEvent(new Event("storage_profile_update"));
  } catch (e) {
    console.error("Failed to clear data", e);
  }
}
