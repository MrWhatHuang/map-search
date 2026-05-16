<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

// 默认值修复，例如：zoom 和 center
const props = withDefaults(defineProps<{ zoom: number; center: string }>(), {
  zoom: 10,
  center: '116.397428,39.90923',
});

const mapContainer = ref<HTMLDivElement | null>(null);
const mapInstance = ref<any>(null);

onMounted(() => {
  if (!mapInstance.value && mapContainer.value) {
    mapInstance.value = new (window as any).AMap.Map(mapContainer.value, {
      zoom: props.zoom,
      center: props.center,
    });
  }
});
</script>