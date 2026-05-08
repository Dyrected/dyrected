<script setup lang="ts">
const route = useRoute();
const dyrected = useDyrected();

const slug = route.params.slug as string;

const { data: post } = await useAsyncData(`post-${slug}`, async () => {
  try {
    const seeds: Record<string, any> = {
      'walking-in-faith': {
        title: 'Walking in Faith',
        slug: 'walking-in-faith',
        content: 'A deep dive into Hebrews 11 and what it means to trust God in the dark. Faith is not the absence of doubt, but the presence of trust in the midst of it.',
      },
      'power-of-grace': {
        title: 'The Power of Grace',
        slug: 'power-of-grace',
        content: 'Understanding the unmerited favor of God in our daily lives. Grace is the power that enables us to be who God called us to be.',
      }
    };
    return await dyrected.collection('posts').findOne(slug, { initialData: seeds[slug] });
  } catch (e) {
    return null;
  }
});

const { data: commentsData } = await useAsyncData(`comments-${slug}`, async () => {
  try {
    // Assuming a 'comments' collection exists with a 'postSlug' field
    return await dyrected.collection('comments').find({ where: { postSlug: { equals: slug } } });
  } catch (e) {
    return { docs: [] };
  }
});

const comments = computed(() => commentsData.value?.docs || []);

const newComment = ref({ author: '', text: '' });

async function submitComment() {
  if (!newComment.value.author || !newComment.value.text) return;
  
  try {
    await dyrected.collection('comments').create({
      ...newComment.value,
      postSlug: slug,
      createdAt: new Date().toISOString()
    });
    // Refresh comments
    refreshNuxtData(`comments-${slug}`);
    newComment.value = { author: '', text: '' };
  } catch (e) {
    alert('Failed to submit comment. Please ensure Dyrected is running.');
  }
}
</script>

<template>
  <div v-if="post">
    <article>
      <h1>{{ post.title }}</h1>
      <div class="content">
        {{ post.content }}
      </div>
    </article>

    <section class="comments">
      <h3>Comments</h3>
      <div v-if="comments && comments.length" class="comment-list">
        <div v-for="comment in comments" :key="comment.id" class="comment">
          <strong>{{ comment.author }}</strong>
          <p>{{ comment.text }}</p>
        </div>
      </div>
      <p v-else>No comments yet.</p>

      <form @submit.prevent="submitComment" class="comment-form">
        <h4>Add a comment</h4>
        <div>
          <label>Name:</label>
          <input v-model="newComment.author" required />
        </div>
        <div>
          <label>Comment:</label>
          <textarea v-model="newComment.text" required></textarea>
        </div>
        <button type="submit">Submit</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.content {
  margin: 2rem 0;
  line-height: 1.6;
}
.comments {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 2px solid #eee;
}
.comment {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
}
.comment-form {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
}
.comment-form div {
  display: flex;
  flex-direction: column;
}
textarea {
  height: 100px;
}
</style>
