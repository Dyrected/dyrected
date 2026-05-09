import { type Block } from "@dyrected/core";

export const GalleryBlockConfig: Block = {
  slug: "imageGallery",
  labels: { singular: "Image Gallery", plural: "Image Galleries" },
  fields: [
    { name: "title", type: "text" },
    {
      name: "images",
      type: "array",
      fields: [
        { name: "image", type: "image" },
        { name: "caption", type: "text" },
      ],
    },
    {
      name: "columns",
      type: "select",
      options: [
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" },
        { label: "4 Columns", value: "4" },
      ],
    },
  ],
};
