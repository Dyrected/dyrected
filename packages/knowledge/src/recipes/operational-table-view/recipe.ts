import {
  defineCollection,
  defineTextField,
  defineBooleanField,
  defineNumberField,
  defineDateTimeField,
  defineView,
  defineAction,
} from "@dyrected/core";

export const checkInAction = defineAction({
  name: "checkIn",
  label: "Check In",
  icon: "UserCheck",
  type: "row",
  confirm: "Confirm guest check-in at the door?",
  mutation: { checkedIn: true, checkedInAt: "now()" },
});

export const attendingGuestsView = defineView({
  slug: "attending-guests",
  label: "Attending Guests",
  icon: "UserCheck",
  layout: "table",
  filter: { attending: { equals: true } },
  columns: ["name", "guestCount", "tableNumber", "checkedIn"],
  sort: { field: "name", direction: "asc" },
  actions: [checkInAction],
});

export const GuestResponses = defineCollection({
  slug: "guest-responses",
  fields: [
    defineTextField({ name: "name", label: "Full Name", required: true }),
    defineTextField({ name: "email", label: "Email" }),
    defineBooleanField({ name: "attending", label: "Attending" }),
    defineNumberField({ name: "guestCount", label: "Plus-Ones", defaultValue: 0 }),
    defineNumberField({ name: "tableNumber", label: "Table Number" }),
    defineBooleanField({ name: "checkedIn", label: "Checked In", defaultValue: false }),
    defineDateTimeField({ name: "checkedInAt", label: "Checked In At" }),
  ],
  views: [attendingGuestsView],
});
