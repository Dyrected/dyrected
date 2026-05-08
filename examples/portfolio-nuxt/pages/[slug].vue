<script setup lang="ts">
import HeroBlock from '~/components/blocks/HeroBlock.vue'
import RichContentBlock from '~/components/blocks/RichContentBlock.vue'
import GalleryBlock from '~/components/blocks/GalleryBlock.vue'
import CTABlock from '~/components/blocks/CTABlock.vue'

const route = useRoute();
const dyrected = useDyrected();
const slug = route.params.slug as string;

const { data: pageData } = await useAsyncData(`page-${slug}`, () => 
  dyrected.collection('pages').find({ 
    where: { slug: { equals: slug } } 
  }).seed([{
    title: 'About Us',
    slug: 'about',
    layout: [
      {
        blockType: 'hero',
        heading: 'Meet Pastor John Smith',
        subheading: 'Serving the community for over 20 years with a passion for spiritual transformation.',
        image: {
          url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
          alt: 'Pastor Photo'
        }
      },
      {
        blockType: 'richContent',
        content: 'Pastor John has dedicated his life to sharing the message of hope. Born and raised in a small town, his journey into ministry began after a life-changing experience that led him to pursue a theological degree and eventually lead this vibrant community.\n\nHis teaching style is known for being practical, engaging, and deeply rooted in scripture, making the ancient word relevant to modern life.'
      },
      {
        blockType: 'callToAction',
        heading: 'Connect with Pastor John',
        description: 'Have a question or need prayer? Reach out to us today.',
        buttonLabel: 'Send Message',
        buttonLink: '#contact',
        theme: 'primary'
      }
    ]
  }])
);

const page = computed(() => pageData.value?.docs[0]);

if (!page.value && !process.server) {
  throw createError({ statusCode: 404, statusMessage: 'Page Not Found' });
}
</script>

<template>
  <div v-if="page" class="dynamic-page">
    <template v-for="(block, i) in page.layout" :key="i">
      <HeroBlock v-if="block.blockType === 'hero'" v-bind="block" />
      <RichContentBlock v-else-if="block.blockType === 'richContent'" v-bind="block" />
      <GalleryBlock v-else-if="block.blockType === 'imageGallery'" v-bind="block" />
      <CTABlock v-else-if="block.blockType === 'callToAction'" v-bind="block" />
    </template>
  </div>
</template>
