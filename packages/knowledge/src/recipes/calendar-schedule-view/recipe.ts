import {
  defineCollection,
  defineTextField,
  defineNumberField,
  defineDateTimeField,
  defineTextareaField,
  defineView,
} from "@dyrected/core";

export const tastingScheduleView = defineView({
  slug: "tasting-schedule",
  label: "Tasting Schedule",
  icon: "Calendar",
  layout: "calendar",
  dateField: "appointmentDate",
  columns: ["guestName", "partySize", "specialRequests"],
});

export const Appointments = defineCollection({
  slug: "appointments",
  fields: [
    defineTextField({ name: "guestName", label: "Guest Name", required: true }),
    defineDateTimeField({ name: "appointmentDate", label: "Appointment Date", required: true }),
    defineNumberField({ name: "partySize", label: "Party Size", defaultValue: 2 }),
    defineTextareaField({ name: "specialRequests", label: "Special Requests" }),
  ],
  views: [tastingScheduleView],
});
