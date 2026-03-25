<template>
  <div ref="eyeRef" class="eyeball" :style="eyeStyle">
    <div v-if="!isBlinking" class="pupil" :style="pupilStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}>(), {
  size: 48,
  pupilSize: 16,
  maxDistance: 10,
  eyeColor: 'white',
  pupilColor: '#2D2D2D',
  isBlinking: false,
});

const eyeRef = ref<HTMLElement>();
const mouseX = ref(0);
const mouseY = ref(0);

const onMouseMove = (e: MouseEvent) => {
  mouseX.value = e.clientX;
  mouseY.value = e.clientY;
};

onMounted(() => window.addEventListener('mousemove', onMouseMove));
onBeforeUnmount(() => window.removeEventListener('mousemove', onMouseMove));

const pupilPos = computed(() => {
  if (props.forceLookX !== undefined && props.forceLookY !== undefined) {
    return { x: props.forceLookX, y: props.forceLookY };
  }
  if (!eyeRef.value) return { x: 0, y: 0 };
  const rect = eyeRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = mouseX.value - cx;
  const dy = mouseY.value - cy;
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), props.maxDistance);
  const angle = Math.atan2(dy, dx);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
});

const eyeStyle = computed(() => ({
  width: `${props.size}px`,
  height: props.isBlinking ? '2px' : `${props.size}px`,
  backgroundColor: props.eyeColor,
}));

const pupilStyle = computed(() => ({
  width: `${props.pupilSize}px`,
  height: `${props.pupilSize}px`,
  backgroundColor: props.pupilColor,
  transform: `translate(${pupilPos.value.x}px, ${pupilPos.value.y}px)`,
}));
</script>

<style scoped>
.eyeball {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.15s;
}

.pupil {
  border-radius: 50%;
  transition: transform 0.1s ease-out;
}
</style>
