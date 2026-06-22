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

import sharedContent from "./shared-content.json";

export const SERVICES = sharedContent.services;
export const CATEGORIES = sharedContent.categories;

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
