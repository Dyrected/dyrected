<script setup lang="ts">
import { computed } from "vue";
import {
  usePageMeta,
  usePageRoute,
  useAdminNotify,
  useAdminNavigate,
} from "@dyrected/vue";

const props = defineProps<{
  slug?: string;
}>();

const notify = useAdminNotify();
const { navigate: adminNav, to } = useAdminNavigate();
const route = usePageRoute();

// Determine active sub-route / tab
const activeTab = computed(() => route.splat || "overview");

// Configure page metadata and header action buttons
usePageMeta({
  title: "Inventory & Fulfillment Hub",
  description: "Track inventory velocity, restock thresholds, and supplier orders.",
  breadcrumbs: [
    { label: "Admin", to: "/" },
    { label: "Catalog" },
    { label: "Inventory Hub" },
  ],
  actions: [
    {
      label: "Sync Stock",
      icon: "RefreshCw",
      variant: "outline",
      onClick: () => {
        notify.info("Synchronizing warehouse stock feeds...");
        setTimeout(() => {
          notify.success("Warehouse stock synchronized (124 items checked)");
        }, 600);
      },
    },
    {
      label: "View Products",
      icon: "Boxes",
      variant: "default",
      onClick: () => {
        adminNav(to.collection("products"));
      },
    },
  ],
});
</script>

<template>
  <div class="dy-space-y-6">
    <!-- Sub-route Navigation Tabs -->
    <div class="dy-flex dy-items-center dy-gap-2 dy-border-b dy-border-border/60 dy-pb-2">
      <button
        type="button"
        @click="route.navigate('')"
        :class="[
          'dy-rounded-lg dy-px-3.5 dy-py-1.5 dy-text-sm dy-font-medium dy-transition-colors',
          activeTab === 'overview'
            ? 'dy-bg-primary dy-text-primary-foreground dy-shadow-sm'
            : 'dy-text-muted-foreground hover:dy-bg-muted/50 hover:dy-text-foreground',
        ]"
      >
        Overview
      </button>

      <button
        type="button"
        @click="route.navigate('alerts')"
        :class="[
          'dy-rounded-lg dy-px-3.5 dy-py-1.5 dy-text-sm dy-font-medium dy-transition-colors',
          activeTab === 'alerts'
            ? 'dy-bg-primary dy-text-primary-foreground dy-shadow-sm'
            : 'dy-text-muted-foreground hover:dy-bg-muted/50 hover:dy-text-foreground',
        ]"
      >
        Low Stock Alerts
      </button>

      <button
        type="button"
        @click="route.navigate('reorder')"
        :class="[
          'dy-rounded-lg dy-px-3.5 dy-py-1.5 dy-text-sm dy-font-medium dy-transition-colors',
          activeTab === 'reorder'
            ? 'dy-bg-primary dy-text-primary-foreground dy-shadow-sm'
            : 'dy-text-muted-foreground hover:dy-bg-muted/50 hover:dy-text-foreground',
        ]"
      >
        Purchase Orders
      </button>
    </div>

    <!-- Tab 1: Overview -->
    <div v-if="activeTab === 'overview'" class="dy-space-y-6">
      <div class="dy-grid dy-grid-cols-1 md:dy-grid-cols-3 dy-gap-4">
        <div class="dy-rounded-xl dy-border dy-border-border/60 dy-bg-card dy-p-5 dy-text-card-foreground dy-shadow-sm">
          <p class="dy-text-xs dy-font-medium dy-text-muted-foreground dy-uppercase dy-tracking-wider">Total SKUs</p>
          <div class="dy-mt-2 dy-flex dy-items-baseline dy-gap-2">
            <span class="dy-text-3xl dy-font-bold dy-tracking-tight">142</span>
            <span class="dy-text-xs dy-font-medium dy-text-emerald-500">+8 this month</span>
          </div>
        </div>

        <div class="dy-rounded-xl dy-border dy-border-border/60 dy-bg-card dy-p-5 dy-text-card-foreground dy-shadow-sm">
          <p class="dy-text-xs dy-font-medium dy-text-muted-foreground dy-uppercase dy-tracking-wider">Low Stock SKUs</p>
          <div class="dy-mt-2 dy-flex dy-items-baseline dy-gap-2">
            <span class="dy-text-3xl dy-font-bold dy-tracking-tight dy-text-amber-500">6</span>
            <span class="dy-text-xs dy-font-medium dy-text-muted-foreground">reorder recommended</span>
          </div>
        </div>

        <div class="dy-rounded-xl dy-border dy-border-border/60 dy-bg-card dy-p-5 dy-text-card-foreground dy-shadow-sm">
          <p class="dy-text-xs dy-font-medium dy-text-muted-foreground dy-uppercase dy-tracking-wider">Fulfillment Rate</p>
          <div class="dy-mt-2 dy-flex dy-items-baseline dy-gap-2">
            <span class="dy-text-3xl dy-font-bold dy-tracking-tight dy-text-emerald-500">99.4%</span>
            <span class="dy-text-xs dy-font-medium dy-text-muted-foreground">on-time dispatch</span>
          </div>
        </div>
      </div>

      <div class="dy-rounded-xl dy-border dy-border-border/60 dy-bg-card dy-p-6 dy-text-card-foreground dy-shadow-sm">
        <h3 class="dy-text-base dy-font-semibold">Quick Actions</h3>
        <p class="dy-text-sm dy-text-muted-foreground dy-mt-1">
          Jump directly to catalog collections or execute warehouse routines.
        </p>

        <div class="dy-mt-4 dy-flex dy-flex-wrap dy-gap-3">
          <button
            type="button"
            @click="adminNav(to.collection('products'))"
            class="dy-inline-flex dy-items-center dy-gap-2 dy-rounded-lg dy-border dy-border-border dy-bg-background dy-px-4 dy-py-2 dy-text-sm dy-font-medium dy-transition-colors hover:dy-bg-muted"
          >
            Manage Products
          </button>
          <button
            type="button"
            @click="adminNav(to.workspace('pages'))"
            class="dy-inline-flex dy-items-center dy-gap-2 dy-rounded-lg dy-border dy-border-border dy-bg-background dy-px-4 dy-py-2 dy-text-sm dy-font-medium dy-transition-colors hover:dy-bg-muted"
          >
            Manage Pages
          </button>
          <button
            type="button"
            @click="notify.success('Export initiated! Report will download shortly.')"
            class="dy-inline-flex dy-items-center dy-gap-2 dy-rounded-lg dy-border dy-border-border dy-bg-background dy-px-4 dy-py-2 dy-text-sm dy-font-medium dy-transition-colors hover:dy-bg-muted"
          >
            Export Stock CSV
          </button>
        </div>
      </div>
    </div>

    <!-- Tab 2: Low Stock Alerts -->
    <div v-else-if="activeTab === 'alerts'" class="dy-space-y-4">
      <div class="dy-rounded-xl dy-border dy-border-border/60 dy-bg-card dy-p-6 dy-text-card-foreground dy-shadow-sm">
        <h3 class="dy-text-base dy-font-semibold">Low Stock Threshold Warnings</h3>
        <p class="dy-text-sm dy-text-muted-foreground dy-mt-1">
          Items below 15 units trigger automatic reorder alerts.
        </p>

        <div class="dy-mt-4 dy-divide-y dy-divide-border/50">
          <div class="dy-py-3 dy-flex dy-items-center dy-justify-between">
            <div>
              <p class="dy-text-sm dy-font-medium">Organic Dried Mango Slices (200g)</p>
              <p class="dy-text-xs dy-text-muted-foreground">SKU: MNG-200 • Warehouse A</p>
            </div>
            <div class="dy-flex dy-items-center dy-gap-3">
              <span class="dy-text-sm dy-font-bold dy-text-destructive">4 units left</span>
              <button
                type="button"
                @click="notify.info('Created purchase draft for MNG-200')"
                class="dy-rounded dy-bg-primary/10 dy-px-2.5 dy-py-1 dy-text-xs dy-font-medium dy-text-primary hover:dy-bg-primary/20"
              >
                Reorder
              </button>
            </div>
          </div>

          <div class="dy-py-3 dy-flex dy-items-center dy-justify-between">
            <div>
              <p class="dy-text-sm dy-font-medium">Roasted Hazelnut Clusters (150g)</p>
              <p class="dy-text-xs dy-text-muted-foreground">SKU: HZL-150 • Warehouse B</p>
            </div>
            <div class="dy-flex dy-items-center dy-gap-3">
              <span class="dy-text-sm dy-font-bold dy-text-amber-500">11 units left</span>
              <button
                type="button"
                @click="notify.info('Created purchase draft for HZL-150')"
                class="dy-rounded dy-bg-primary/10 dy-px-2.5 dy-py-1 dy-text-xs dy-font-medium dy-text-primary hover:dy-bg-primary/20"
              >
                Reorder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: Purchase Orders -->
    <div v-else-if="activeTab === 'reorder'" class="dy-space-y-4">
      <div class="dy-rounded-xl dy-border dy-border-border/60 dy-bg-card dy-p-6 dy-text-card-foreground dy-shadow-sm">
        <h3 class="dy-text-base dy-font-semibold">Recent Purchase Orders</h3>
        <p class="dy-text-sm dy-text-muted-foreground dy-mt-1">
          Track supplier dispatch and intake receipts.
        </p>

        <div class="dy-mt-4 dy-space-y-3">
          <div class="dy-rounded-lg dy-border dy-border-border/40 dy-p-4 dy-flex dy-items-center dy-justify-between">
            <div>
              <p class="dy-text-sm dy-font-semibold">PO #2026-0881 — Golden Valley Orchards</p>
              <p class="dy-text-xs dy-text-muted-foreground">500 units • ETA: Tomorrow 10:00 AM</p>
            </div>
            <span class="dy-rounded-full dy-bg-emerald-500/10 dy-px-3 dy-py-1 dy-text-xs dy-font-medium dy-text-emerald-500">
              In Transit
            </span>
          </div>

          <div class="dy-rounded-lg dy-border dy-border-border/40 dy-p-4 dy-flex dy-items-center dy-justify-between">
            <div>
              <p class="dy-text-sm dy-font-semibold">PO #2026-0880 — Cascadian Roasters</p>
              <p class="dy-text-xs dy-text-muted-foreground">350 units • Delivered Oct 14</p>
            </div>
            <span class="dy-rounded-full dy-bg-muted dy-px-3 dy-py-1 dy-text-xs dy-font-medium dy-text-muted-foreground">
              Received
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
