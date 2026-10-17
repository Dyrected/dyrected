<script setup lang="ts">
const boom = () => { throw new Error("late failure"); };
</script>
<template><button @click="boom">go</button></template>
