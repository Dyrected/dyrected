import { defineCollection } from "@dyrected/core";
import { Media } from "./media.js";
import { authorsSeed } from "../seed.js";

export const Authors = defineCollection({
  slug: "authors",
  labels: { plural: "Authors", singular: "Author" },
  admin: {
    useAsTitle: "name",
    group: "Content",
    defaultColumns: ["name", "email", "website", "country", "memberId"],
    icon: "Users",
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "email",
      label: "Email",
      type: "email",
      // Renders as a clickable mailto link in the list.
      admin: { format: "link" },
    },
    {
      name: "website",
      label: "Website",
      type: "url",
      // Renders as a clickable external link in the list.
      admin: { format: "link" },
    },
    {
      name: "memberId",
      label: "Member ID",
      type: "text",
      // Hides all but the last 4 characters in the list.
      admin: { format: { type: "mask", reveal: 4 } },
    },
    { name: "bio", type: "textarea" },
    { name: "avatar", type: "relationship", relationTo: Media.slug },
    {
      name: "blogPosts",
      type: "join",
      collection: "blog",
      on: "author",
      label: "Articles",
      admin: {
        tab: "Articles",
        description: "Blog posts written by this author",
      },
    },
    {
      name: "country",
      type: "select",
      options: async () => {
        const cache = globalThis as any as { __dyrectedCountryOptions?: { label: string; value: string }[] };
        if (cache.__dyrectedCountryOptions) return cache.__dyrectedCountryOptions;
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
        if (!response.ok) return [];
        const data = (await response.json()) as Array<{ name: { common: string }; cca2: string }>;
        if (!Array.isArray(data)) return [];
        cache.__dyrectedCountryOptions = data
          .map((country) => ({ label: country.name.common, value: country.cca2 }))
          .sort((a, b) => a.label.localeCompare(b.label));
        return cache.__dyrectedCountryOptions;
      },
      // A neutral badge for the selected country in the list.
      admin: { width: "50%", format: "badge" },
    },
    {
      name: "state",
      type: "select",
      options: [],
      admin: {
        width: "50%",
        hooks: {
          options: async ({ siblingData }) => {
            const country = Array.isArray(siblingData?.country) ? siblingData.country[0] : siblingData?.country;
            if (!country) return [];

            const iso2 = String(country).toUpperCase();
            const cache = ((globalThis as any).__dyrectedRegionOptionsByCountry ??= {});
            if (cache[iso2]) return cache[iso2];

            cache[iso2] = fetch("https://countriesnow.space/api/v0.1/countries/states", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ iso2 }),
            })
              .then(async (response) => {
                if (!response.ok) return [];

                const data = (await response.json()) as {
                  error: boolean;
                  data?: { states?: Array<{ name: string; state_code?: string }> };
                };

                if (data.error || !data.data?.states) return [];

                return data.data.states
                  .map((state) => ({ label: state.name, value: state.state_code || state.name }))
                  .sort((a, b) => a.label.localeCompare(b.label));
              })
              .catch(() => {
                delete cache[iso2];
                return [];
              });

            return cache[iso2];
          },
        },
      },
    },
  ],
  initialData: authorsSeed,
});
