<script setup lang="ts">
import HeroBlock from "~/components/blocks/HeroBlock/index.vue";
import RichContentBlock from "~/components/blocks/RichContentBlock/index.vue";
import GalleryBlock from "~/components/blocks/GalleryBlock/index.vue";
import CTABlock from "~/components/blocks/CTABlock/index.vue";
import TestimonialBlock from "~/components/blocks/TestimonialBlock/index.vue";
import type { DyrectedSchema } from "~/dyrected-types";

const route = useRoute();
const dyrected = useDyrected<DyrectedSchema>();
const { data: settings } = useNuxtData<DyrectedSchema['globals']['settings']>('settings');

// Catch-all slug is an array
const slugArray = route.params.slug as string[];
let slug = slugArray && slugArray.length > 0 ? slugArray.join('/') : '';

// If root path, try to get home page from settings
if (!slug && settings.value?.homePage) {
  const hp = settings.value.homePage;
  slug = typeof hp === 'string' ? hp : hp.slug;
}

// Fallback to 'home' if still empty
if (!slug) slug = 'home';

const { data: pageData } = await useAsyncData(`page-${slug}`, () =>
  dyrected
    .collection("pages")
    .find({
      where: { slug: { equals: slug } },
    })
    .seed([
      {
        title: "Home",
        slug: "home",
        layout: [
          {
            blockType: "hero",
            heading: "Welcome to Our Church",
            subheading: "Serving the community with passion.",
            image: {
              url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
              alt: "Pastor Photo",
            },
          },
          {
            blockType: "testimonial",
            heading: "What People Say",
            subheading: "Testimonials from our community",
            testimonials: [
              {
                name: "Pastor",
                position: "Senior Pastor",
                quote: "This is a dynamic testimonial seeded automatically.",
                avatar: {
                  url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
                  alt: "Pastor Photo",
                },
              }
            ],
          },
        ],
      },
      {
        title: "About Us",
        slug: "about",
        layout: [
          {
            blockType: "hero",
            heading: "Our Story",
            subheading: "A journey of faith and community.",
          },
          {
            blockType: "richContent",
            content: "We have been serving the community for over 20 years...",
          },
        ],
      },
      {
        title: "Contact Us",
        slug: "contact",
        layout: [
          {
            blockType: "hero",
            heading: "Get in Touch",
            subheading: "We would love to hear from you.",
          },
          {
            blockType: "callToAction",
            heading: "Send us a Message",
            description: "Fill out the form below or reach out via social media.",
            buttonLabel: "Contact Form",
            buttonLink: "#form",
          }
        ]
      }
    ] as any)
    .exec(),
);

const page = computed(() => pageData.value?.docs[0]);

if (!page.value && !process.server) {
  throw createError({ statusCode: 404, statusMessage: "Page Not Found" });
}
</script>

<template>
  <div v-if="page" class="dynamic-page">
    <template v-for="(block, i) in page.layout" :key="i">
      <HeroBlock v-if="block.blockType === 'hero'" v-bind="block" />
      <RichContentBlock v-else-if="block.blockType === 'richContent'" v-bind="block" />
      <GalleryBlock v-else-if="block.blockType === 'imageGallery'" v-bind="block" />
      <CTABlock v-else-if="block.blockType === 'callToAction'" v-bind="block" />
      <TestimonialBlock v-else-if="block.blockType === 'testimonial'" v-bind="block" />
    </template>
  </div>
</template>
