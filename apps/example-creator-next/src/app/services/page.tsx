import { getServices, getServicesPageContent } from "@/lib/dyrected";
import ServicesContent, { type Service } from "./ServicesContent";
import { SERVICES as FALLBACK_SERVICES } from "@/lib/storage";

export default async function Services() {
  const [servicesPageGlobal, serviceDocs] = await Promise.all([
    getServicesPageContent(),
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
    <ServicesContent
      servicesPageGlobal={servicesPageGlobal as Parameters<typeof ServicesContent>[0]["servicesPageGlobal"]}
      services={services}
    />
  );
}
