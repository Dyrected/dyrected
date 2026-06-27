"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight } from "lucide-react";
import { getStoredProfile, saveBooking, Booking } from "@/lib/storage";
import bookingFallback from "./booking-content.json";
import type { Service } from "@/app/services/ServicesContent";

type BookingPageGlobal = {
  serviceStep?: { title?: string; description?: string };
  intakeStep?: { title?: string; description?: string };
  scheduleStep?: {
    title?: string;
    description?: string;
    dates?: Array<{ label: string; desc: string }>;
  };
  successStep?: {
    badge?: string;
    title?: string;
    description?: string;
    note?: string;
  };
} | null;

export default function BookingContent({
  bookingPageGlobal,
  services,
}: {
  bookingPageGlobal?: BookingPageGlobal;
  services: Service[];
}) {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("service");

  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? "future-alignment");
  const [frustration, setFrustration] = useState("");
  const [longestDelayed, setLongestDelayed] = useState("");
  const [fiveYearProjection, setFiveYearProjection] = useState("");
  const [proudGoal, setProudGoal] = useState("");
  const [biggestObstacle, setBiggestObstacle] = useState("");
  const [triedSolutions, setTriedSolutions] = useState("");
  const [whyNow, setWhyNow] = useState("");
  const [selectedDate, setSelectedDate] = useState("Tomorrow");
  const [selectedTime, setSelectedTime] = useState("10:00 AM");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (serviceParam) {
        const match = services.find((s) => s.id === serviceParam);
        if (match) {
          setSelectedServiceId(match.id);
          setStep(2);
        }
      }
      const profile = getStoredProfile();
      if (profile) {
        setName(profile.name);
        setEmail(profile.email);
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [serviceParam, services]);

  const activeService = services.find((s) => s.id === selectedServiceId) ?? services[0];

  const handleServiceSelect = (id: string) => {
    setSelectedServiceId(id);
    setStep(2);
  };

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleConfirmBooking = () => {
    if (!name || !email) {
      alert("Please provide your name and email to receive the timeline alignment credentials.");
      return;
    }
    const saved = saveBooking({
      serviceId: selectedServiceId,
      serviceName: activeService?.name ?? "",
      intakeAnswers: { frustration, longestDelayed, fiveYearProjection, proudGoal, biggestObstacle, triedSolutions, whyNow },
      slotDate: selectedDate,
      slotTime: selectedTime,
    });
    setConfirmedBooking(saved);
    setStep(4);
  };

  const serviceStep = {
    title: bookingPageGlobal?.serviceStep?.title ?? bookingFallback.serviceStep.title,
    description: bookingPageGlobal?.serviceStep?.description ?? bookingFallback.serviceStep.description,
  };

  const intakeStep = {
    title: bookingPageGlobal?.intakeStep?.title ?? bookingFallback.intakeStep.title,
    description: bookingPageGlobal?.intakeStep?.description ?? bookingFallback.intakeStep.description,
  };

  const scheduleStep = {
    title: bookingPageGlobal?.scheduleStep?.title ?? bookingFallback.scheduleStep.title,
    description: bookingPageGlobal?.scheduleStep?.description ?? bookingFallback.scheduleStep.description,
    dates:
      bookingPageGlobal?.scheduleStep?.dates && bookingPageGlobal.scheduleStep.dates.length > 0
        ? bookingPageGlobal.scheduleStep.dates
        : bookingFallback.scheduleStep.dates,
  };

  const successStep = {
    badge: bookingPageGlobal?.successStep?.badge ?? bookingFallback.successStep.badge,
    title: bookingPageGlobal?.successStep?.title ?? bookingFallback.successStep.title,
    description: bookingPageGlobal?.successStep?.description ?? bookingFallback.successStep.description,
    note: bookingPageGlobal?.successStep?.note ?? bookingFallback.successStep.note,
  };

  const times = ["9:00 AM", "11:30 AM", "2:00 PM", "4:30 PM"];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-background">
      {/* Wizard Steps indicator */}
      {step < 4 && (
        <div className="flex items-center justify-between max-w-md mx-auto mb-10 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <div className={`flex flex-col items-center gap-1.5 ${step === 1 ? "text-primary" : ""}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current">1</span>
            <span>Program</span>
          </div>
          <div className="flex-1 h-px bg-white/5 mx-2" />
          <div className={`flex flex-col items-center gap-1.5 ${step === 2 ? "text-primary" : ""}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current">2</span>
            <span>Intake</span>
          </div>
          <div className="flex-1 h-px bg-white/5 mx-2" />
          <div className={`flex flex-col items-center gap-1.5 ${step === 3 ? "text-primary" : ""}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current">3</span>
            <span>Schedule</span>
          </div>
        </div>
      )}

      {/* Step 1: Program Choice */}
      {step === 1 && (
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
              {serviceStep.title}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {serviceStep.description}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => handleServiceSelect(s.id)}
                className={`text-left rounded-2xl border p-6 flex flex-col justify-between hover:border-primary/50 transition-all ${
                  selectedServiceId === s.id
                    ? "bg-primary/5 border-primary shadow-lg shadow-primary/5 scale-102"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="space-y-4">
                  <h3 className="font-heading font-bold text-white text-base leading-snug">{s.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 w-full">
                  <span className="text-sm font-bold text-white">{s.price}</span>
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Intake Questionnaire */}
      {step === 2 && (
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="space-y-3">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to services</span>
            </button>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
              {intakeStep.title}
            </h1>
            <p className="text-sm text-muted-foreground">{intakeStep.description}</p>
          </div>

          <form onSubmit={handleIntakeSubmit} className="glass-panel border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              {[
                { label: "What is Future You most frustrated about?", value: frustration, setter: setFrustration, multiline: true, placeholder: "e.g. My tendency to buy gym memberships and spend evenings on the couch." },
                { label: "What goal have you delayed the longest?", value: longestDelayed, setter: setLongestDelayed, placeholder: "e.g. Launching my side business / Learning to speak Spanish." },
                { label: "If nothing changed, where would you be in five years?", value: fiveYearProjection, setter: setFiveYearProjection, multiline: true, placeholder: "e.g. In the exact same job, feeling slightly more tired and regretful." },
                { label: "What would make Future You proud?", value: proudGoal, setter: setProudGoal, placeholder: "e.g. Shipping a product with 100 paying customers." },
                { label: "What is your biggest obstacle today?", value: biggestObstacle, setter: setBiggestObstacle, placeholder: "e.g. Terrible focus management and checking social feeds every 10 minutes." },
                { label: "What have you already tried?", value: triedSolutions, setter: setTriedSolutions, placeholder: "e.g. Buying planners, reading atomic habits twice, setting screen time limits." },
                { label: "Why are you seeking help now?", value: whyNow, setter: setWhyNow, placeholder: "e.g. Tired of dreaming about a life I know I can build if I just execute." },
              ].map(({ label, value, setter, multiline, placeholder }) => (
                <div key={label} className="space-y-2">
                  <label className="text-sm font-semibold text-white block">{label}</label>
                  {multiline ? (
                    <textarea
                      required
                      rows={3}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:scale-102 transition-all shadow-lg"
            >
              <span>Continue to Scheduler</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Calendar Slots & Confirmation */}
      {step === 3 && (
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="space-y-3">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to questionnaire</span>
            </button>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
              {scheduleStep.title}
            </h1>
            <p className="text-sm text-muted-foreground">{scheduleStep.description}</p>
          </div>

          <div className="glass-panel border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Available Days
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {scheduleStep.dates.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => setSelectedDate(d.label)}
                    type="button"
                    className={`rounded-2xl border p-4 text-center transition-all ${
                      selectedDate === d.label
                        ? "bg-primary/10 border-primary text-white scale-102"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span className="font-bold text-sm block">{d.label}</span>
                    <span className="text-[10px] text-muted-foreground block mt-1 leading-none">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Available Slots (Your Dimension Time)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {times.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    type="button"
                    className={`rounded-xl border py-2.5 text-center font-semibold text-sm transition-all ${
                      selectedTime === t
                        ? "bg-secondary/15 border-secondary text-secondary scale-102 font-bold"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-white/5 pt-6">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Alignment Notification Coordinates
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                />
                <input
                  type="email"
                  required
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2">
              <h4 className="text-xs text-primary font-bold uppercase tracking-wider">Alignment Summary:</h4>
              <p className="text-sm text-white font-semibold">
                {activeService?.name} &bull; {selectedDate} at {selectedTime}
              </p>
              <p className="text-xs text-muted-foreground leading-normal">
                Credentials and access links will be dispatched to{" "}
                <span className="text-white">{email || "(pending email)"}</span>.
              </p>
            </div>

            <button
              onClick={handleConfirmBooking}
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-bold text-black hover:scale-102 transition-all shadow-lg"
            >
              <Check className="h-4 w-4" />
              <span>Confirm Alignment Session</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Booking Confirmed */}
      {step === 4 && confirmedBooking && (
        <div className="glass-panel border-white/5 rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto mt-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-secondary/20 blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-24 w-24 rounded-full bg-primary/20 blur-xl pointer-events-none" />

          <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-secondary/20 border border-secondary/30 text-secondary mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-widest">
              {successStep.badge}
            </span>
            <h1 className="font-heading text-3xl font-extrabold text-white">{successStep.title}</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              {successStep.description}
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 max-w-md mx-auto space-y-3 text-left">
            <div className="flex justify-between border-b border-white/5 pb-2 text-xs text-muted-foreground font-semibold uppercase">
              <span>Parameters</span>
              <span>Coordinates</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Service</span>
              <span className="text-white font-bold">{confirmedBooking.serviceName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Coordinates</span>
              <span className="text-white font-bold">{confirmedBooking.slotDate} @ {confirmedBooking.slotTime}</span>
            </div>
            <div className="flex justify-between text-sm pt-1.5">
              <span className="text-muted-foreground font-medium">Booking ID</span>
              <span className="text-secondary font-mono font-bold">{confirmedBooking.bookingCode}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/60 italic max-w-sm mx-auto leading-normal">
            {successStep.note}
          </p>

          <div className="flex gap-4 justify-center pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:scale-102 transition-all shadow-lg"
            >
              <span>View Your Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 transition-all"
            >
              <span>Back Home</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
