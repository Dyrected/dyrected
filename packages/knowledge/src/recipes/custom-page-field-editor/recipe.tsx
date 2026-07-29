import {
  DyrectedFieldPathProvider,
  DyrectedFormProvider,
  useDyrectedForm,
  useField,
} from "@dyrected/react";
import { createDyrectedFormController } from "@dyrected/admin/public";

const controller = createDyrectedFormController({
  collection: "customers",
  fields: [
    { name: "fullName", type: "text", label: "Full name" },
    { name: "email", type: "email", label: "Email address" },
    {
      name: "complaintDraft",
      type: "object",
      label: "Complaint draft",
      fields: [
        { name: "orderNumber", type: "text", label: "Order number" },
        { name: "subject", type: "text", label: "Subject" },
        { name: "message", type: "textarea", label: "Complaint message" },
      ],
    },
  ],
  initialValues: {
    fullName: "Amara Okafor",
    email: "amara@example.com",
    complaintDraft: {
      orderNumber: "ORD-2048",
      subject: "Damaged package on arrival",
      message: "The shipping box arrived wet and the product inside is scratched.",
    },
  },
});

function CustomerIdentityCard() {
  const fullName = useField("fullName");
  const email = useField("email");

  return (
    <section className="space-y-4">
      <input
        value={String(fullName.value ?? "")}
        onChange={(event) => fullName.setValue(event.target.value)}
      />

      <input
        type="email"
        value={String(email.value ?? "")}
        onChange={(event) => email.setValue(event.target.value)}
      />
    </section>
  );
}

function ComplaintDraftEditor() {
  const orderNumber = useField("orderNumber");
  const subject = useField("subject");
  const message = useField("message");

  return (
    <section className="space-y-4">
      <input
        value={String(orderNumber.value ?? "")}
        onChange={(event) => orderNumber.setValue(event.target.value)}
      />

      <input
        value={String(subject.value ?? "")}
        onChange={(event) => subject.setValue(event.target.value)}
      />

      <textarea
        value={String(message.value ?? "")}
        onChange={(event) => message.setValue(event.target.value)}
      />
    </section>
  );
}

function CustomerComplaintPage() {
  const form = useDyrectedForm();

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit();
      }}
    >
      <h1>Complaint draft for signed-in customer</h1>

      <CustomerIdentityCard />

      <DyrectedFieldPathProvider path="complaintDraft">
        <ComplaintDraftEditor />
      </DyrectedFieldPathProvider>

      <button type="submit" disabled={form.isSubmitting}>
        Save complaint draft
      </button>
    </form>
  );
}

export default function CustomerComplaintRoute() {
  return (
    <DyrectedFormProvider controller={controller}>
      <CustomerComplaintPage />
    </DyrectedFormProvider>
  );
}
