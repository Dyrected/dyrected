<script setup lang="ts">
import "@dyrected/admin/styles";
import RsvpLink from "~/components/RsvpLink.vue";

const { preference, systemTheme, setTheme } = useTheme();

const customComponents = {
  fields: {
    rsvpLink: RsvpLink,
  },
};
</script>

<template>
  <DyrectedAdmin
    :components="customComponents"
    :theme="preference"
    :system-theme="systemTheme"
    :on-theme-change="setTheme"
  />
</template>
