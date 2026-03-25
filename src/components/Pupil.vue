<template>
  <div ref="pupilRef" class="pupil" :style="style"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}>(), {
  size: 12,
  maxDistance: 5,
  pupilColor: '#2D2D2D',
});

const pupilRef = ref<HTMLElement>();
const mouseX = ref(0);
const mouseY = ref(0);

const onMouseMove = (e: MouseEvent) => {
  mouseX.value = e.clientX;
  mouseY.value = e.clientY;
};

onMounted(() => window.addEventListener('mousemove', onMouseMove));
onBeforeUnmount(() => window.removeEventListener('mousemove', onMouseMove));

const pos = computed(() => {
  if (props.forceLookX !== undefined && props.forceLookY !== undefined) {
    return { x: props.forceLookX, y: props.forceLookY };
  }
  if (!pupilRef.value) return { x: 0, y: 0 };
  const rect = pupilRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = mouseX.value - cx;
  const dy = mouseY.value - cy;
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), props.maxDistance);
  const angle = Math.atan2(dy, dx);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
});

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  backgroundColor: props.pupilColor,
  borderRadius: '50%',
  transform: `translate(${pos.value.x}px, ${pos.value.y}px)`,
  transition: 'transform 0.1s ease-out',
}));
</script>
