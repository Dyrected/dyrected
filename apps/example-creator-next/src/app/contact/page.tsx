import { getContactPageContent } from "@/lib/dyrected";
import ContactContent from "./ContactContent";

export default async function Contact() {
  const contactGlobal = await getContactPageContent();
  return (
    <ContactContent
      contactGlobal={contactGlobal as Parameters<typeof ContactContent>[0]["contactGlobal"]}
    />
  );
}
