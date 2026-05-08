import { type Block } from "@dyrected/core";

export const TestimonialBlockConfig: Block = {
  slug: "testimonial",
  labels: { singular: "Testimonial", plural: "Testimonials" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "subheading", type: "text", required: true },
    {
      name: "testimonials",
      type: "array",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "position", type: "text", required: true },
        { name: "avatar", type: "relationship", relationTo: "media" },
        { name: "quote", type: "textarea", required: true },
      ],
    },
  ],
};
