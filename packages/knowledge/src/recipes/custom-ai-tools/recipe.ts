import { defineCollection, defineTextField, defineDateField } from "@dyrected/core";
import type { DyrectedConfig } from "@dyrected/core";
import { z } from "zod";

export const Appointments = defineCollection({
  slug: "appointments",
  labels: { singular: "Appointment", plural: "Appointments" },
  fields: [
    defineTextField({ name: "clientName", label: "Client Name", required: true }),
    defineDateField({ name: "bookingDate", label: "Date", required: true }),
    defineTextField({ name: "timeSlot", label: "Time Slot", required: true }),
  ],
});

export const config: DyrectedConfig = {
  collections: [Appointments],
  globals: [],
  ai: {
    tools: {
      checkConsultationSlots: {
        description: "Check available 1-on-1 coaching slots for a given date in YYYY-MM-DD format",
        parameters: z.object({
          date: z.string().describe("Target date in YYYY-MM-DD format, e.g. 2026-09-01"),
        }),
        execute: async ({ date }, { db }) => {
          const existingBookings = await db.find({
            collection: "appointments",
            where: {
              bookingDate: { equals: date },
              status: { notEquals: "cancelled" },
            },
          });

          const bookedHours = new Set(existingBookings.docs.map((doc: any) => doc.timeSlot));
          const allSlots = ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"];
          const available = allSlots.filter((slot) => !bookedHours.has(slot));

          return {
            date,
            totalSlots: allSlots.length,
            availableSlots: available,
            isFullyBooked: available.length === 0,
          };
        },
      },
    },
  },
};
