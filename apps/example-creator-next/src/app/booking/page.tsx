import { Suspense } from "react";
import { getBookingPageContent, getServices } from "@/lib/dyrected";
import BookingContent from "./BookingContent";
import { SERVICES as FALLBACK_SERVICES } from "@/lib/storage";
import type { Service } from "@/app/services/ServicesContent";

export default async function BookingWizard() {
  const [bookingPageGlobal, serviceDocs] = await Promise.all([
    getBookingPageContent(),
    getServices(),
  ]);

  const services: Service[] =
    serviceDocs.length > 0
      ? serviceDocs.map((s) => ({
          id: s.serviceId,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration,
          benefits: s.benefits.map((b) => b.text),
        }))
      : FALLBACK_SERVICES.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration,
          benefits: s.benefits as string[],
        }));

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-background">
          <div className="space-y-4 max-w-md">
            <h2 className="text-2xl font-bold text-white">Loading Booking System...</h2>
          </div>
        </div>
      }
    >
      <BookingContent
        bookingPageGlobal={bookingPageGlobal as Parameters<typeof BookingContent>[0]["bookingPageGlobal"]}
        services={services}
      />
    </Suspense>
  );
}
