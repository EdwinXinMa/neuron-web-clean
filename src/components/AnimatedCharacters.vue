<template>
  <div class="characters-container" ref="containerRef">
    <!-- 紫色角色 -->
    <div ref="purpleRef" class="character purple" :class="{ laughing: loginFailed }" :style="purpleStyle">
      <div class="eyes-container" :style="purpleEyesStyle">
        <template v-if="loginFailed">
          <div class="laugh-eye">˄</div>
          <div class="laugh-eye">˄</div>
        </template>
        <template v-else>
          <EyeBall :size="18" :pupilSize="7" :maxDistance="5" :isBlinking="isPurpleBlinking"
            :forceLookX="purpleForceLookX" :forceLookY="purpleForceLookY" />
          <EyeBall :size="18" :pupilSize="7" :maxDistance="5" :isBlinking="isPurpleBlinking"
            :forceLookX="purpleForceLookX" :forceLookY="purpleForceLookY" />
        </template>
      </div>
      <div v-if="loginFailed" class="laugh-mouth purple-mouth">ᗜ</div>
    </div>

    <!-- 黑色角色 -->
    <div ref="blackRef" class="character black-char" :class="{ laughing: loginFailed }" :style="blackStyle">
      <div class="eyes-container" :style="blackEyesStyle">
        <template v-if="loginFailed">
          <div class="laugh-eye laugh-eye-white">˄</div>
          <div class="laugh-eye laugh-eye-white">˄</div>
        </template>
        <template v-else>
          <EyeBall :size="16" :pupilSize="6" :maxDistance="4" :isBlinking="isBlackBlinking"
            :forceLookX="blackForceLookX" :forceLookY="blackForceLookY" />
          <EyeBall :size="16" :pupilSize="6" :maxDistance="4" :isBlinking="isBlackBlinking"
            :forceLookX="blackForceLookX" :forceLookY="blackForceLookY" />
        </template>
      </div>
      <div v-if="loginFailed" class="laugh-mouth black-mouth">ᗜ</div>
    </div>

    <!-- 橙色角色 -->
    <div ref="orangeRef" class="character orange" :class="{ laughing: loginFailed }" :style="orangeStyle">
      <div class="eyes-container pupils-only" :style="orangeEyesStyle">
        <template v-if="loginFailed">
          <div class="laugh-eye">˄</div>
          <div class="laugh-eye">˄</div>
        </template>
        <template v-else>
          <Pupil :size="12" :maxDistance="5" :forceLookX="orangeForceLookX" :forceLookY="orangeForceLookY" />
          <Pupil :size="12" :maxDistance="5" :forceLookX="orangeForceLookX" :forceLookY="orangeForceLookY" />
        </template>
      </div>
      <div v-if="loginFailed" class="laugh-mouth orange-mouth">ᗜ</div>
    </div>

    <!-- 黄色角色 -->
    <div ref="yellowRef" class="character yellow" :class="{ laughing: loginFailed }" :style="yellowStyle">
      <div class="eyes-container pupils-only" :style="yellowEyesStyle">
        <template v-if="loginFailed">
          <div class="laugh-eye">˄</div>
          <div class="laugh-eye">˄</div>
        </template>
        <template v-else>
          <Pupil :size="12" :maxDistance="5" :forceLookX="yellowForceLookX" :forceLookY="yellowForceLookY" />
          <Pupil :size="12" :maxDistance="5" :forceLookX="yellowForceLookX" :forceLookY="yellowForceLookY" />
        </template>
      </div>
      <div class="mouth" v-if="!loginFailed" :style="yellowMouthStyle"></div>
      <div v-if="loginFailed" class="laugh-mouth yellow-mouth">ᗜ</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import EyeBall from './EyeBall.vue';
import Pupil from './Pupil.vue';

const props = withDefaults(defineProps<{
  isTyping?: boolean;
  showPassword?: boolean;
  passwordLength?: number;
  loginFailed?: boolean;
}>(), {
  isTyping: false,
  showPassword: false,
  passwordLength: 0,
  loginFailed: false,
});

const containerRef = ref<HTMLElement>();
const purpleRef = ref<HTMLElement>();
const blackRef = ref<HTMLElement>();
const orangeRef = ref<HTMLElement>();
const yellowRef = ref<HTMLElement>();

const mouseX = ref(0);
const mouseY = ref(0);
const isPurpleBlinking = ref(false);
const isBlackBlinking = ref(false);
const isLookingAtEachOther = ref(false);
const isPurplePeeking = ref(false);

const loginFailed = computed(() => props.loginFailed);

// 鼠标追踪
const onMouseMove = (e: MouseEvent) => {
  mouseX.value = e.clientX;
  mouseY.value = e.clientY;
};

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove);
  startBlinking();
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove);
});

// 眨眼
let purpleBlinkTimer: ReturnType<typeof setTimeout>;
let blackBlinkTimer: ReturnType<typeof setTimeout>;

function startBlinking() {
  const schedulePurple = () => {
    purpleBlinkTimer = setTimeout(() => {
      isPurpleBlinking.value = true;
      setTimeout(() => {
        isPurpleBlinking.value = false;
        schedulePurple();
      }, 150);
    }, Math.random() * 4000 + 3000);
  };
  const scheduleBlack = () => {
    blackBlinkTimer = setTimeout(() => {
      isBlackBlinking.value = true;
      setTimeout(() => {
        isBlackBlinking.value = false;
        scheduleBlack();
      }, 150);
    }, Math.random() * 4000 + 3000);
  };
  schedulePurple();
  scheduleBlack();
}

onBeforeUnmount(() => {
  clearTimeout(purpleBlinkTimer);
  clearTimeout(blackBlinkTimer);
});

// 打字时互相看
watch(() => props.isTyping, (v) => {
  if (v) {
    isLookingAtEachOther.value = true;
    setTimeout(() => { isLookingAtEachOther.value = false; }, 800);
  }
});

// 偷看密码
watch([() => props.passwordLength, () => props.showPassword, isPurplePeeking], () => {
  if (props.passwordLength > 0 && props.showPassword && !isPurplePeeking.value) {
    setTimeout(() => {
      isPurplePeeking.value = true;
      setTimeout(() => { isPurplePeeking.value = false; }, 800);
    }, Math.random() * 3000 + 2000);
  }
});

// 位置计算
function calcPos(el: HTMLElement | undefined) {
  if (!el) return { faceX: 0, faceY: 0, bodySkew: 0 };
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 3;
  const dx = mouseX.value - cx;
  const dy = mouseY.value - cy;
  return {
    faceX: Math.max(-15, Math.min(15, dx / 20)),
    faceY: Math.max(-10, Math.min(10, dy / 30)),
    bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
  };
}

const purplePos = computed(() => calcPos(purpleRef.value));
const blackPos = computed(() => calcPos(blackRef.value));
const orangePos = computed(() => calcPos(orangeRef.value));
const yellowPos = computed(() => calcPos(yellowRef.value));

const isHidingPassword = computed(() => props.passwordLength > 0 && !props.showPassword);
const isPwdVisible = computed(() => props.passwordLength > 0 && props.showPassword);

// 紫色角色
const purpleStyle = computed(() => {
  if (loginFailed.value) {
    return { height: '400px', transform: 'skewX(-5deg) translateX(10px)' };
  }
  const skew = isPwdVisible.value ? 0
    : (props.isTyping || isHidingPassword.value) ? (purplePos.value.bodySkew - 12) : purplePos.value.bodySkew;
  const tx = (props.isTyping || isHidingPassword.value) && !isPwdVisible.value ? 40 : 0;
  const h = (props.isTyping || isHidingPassword.value) ? 440 : 400;
  return {
    height: `${h}px`,
    transform: `skewX(${skew}deg) translateX(${tx}px)`,
  };
});

const purpleEyesStyle = computed(() => {
  if (loginFailed.value) return { left: '55px', top: '40px', gap: '32px' };
  const x = isPwdVisible.value ? 20 : isLookingAtEachOther.value ? 55 : 45 + purplePos.value.faceX;
  const y = isPwdVisible.value ? 35 : isLookingAtEachOther.value ? 65 : 40 + purplePos.value.faceY;
  return { left: `${x}px`, top: `${y}px`, gap: '32px' };
});

const purpleForceLookX = computed(() =>
  isPwdVisible.value ? (isPurplePeeking.value ? 4 : -4) : isLookingAtEachOther.value ? 3 : undefined
);
const purpleForceLookY = computed(() =>
  isPwdVisible.value ? (isPurplePeeking.value ? 5 : -4) : isLookingAtEachOther.value ? 4 : undefined
);

// 黑色角色
const blackStyle = computed(() => {
  if (loginFailed.value) return { transform: 'skewX(-3deg) translateX(5px)' };
  const skew = isPwdVisible.value ? 0
    : isLookingAtEachOther.value ? (blackPos.value.bodySkew * 1.5 + 10)
    : (props.isTyping || isHidingPassword.value) ? blackPos.value.bodySkew * 1.5
    : blackPos.value.bodySkew;
  const tx = isLookingAtEachOther.value && !isPwdVisible.value ? 20 : 0;
  return { transform: `skewX(${skew}deg) translateX(${tx}px)` };
});

const blackEyesStyle = computed(() => {
  if (loginFailed.value) return { left: '35px', top: '30px', gap: '24px' };
  const x = isPwdVisible.value ? 10 : isLookingAtEachOther.value ? 32 : 26 + blackPos.value.faceX;
  const y = isPwdVisible.value ? 28 : isLookingAtEachOther.value ? 12 : 32 + blackPos.value.faceY;
  return { left: `${x}px`, top: `${y}px`, gap: '24px' };
});

const blackForceLookX = computed(() =>
  isPwdVisible.value ? -4 : isLookingAtEachOther.value ? 0 : undefined
);
const blackForceLookY = computed(() =>
  isPwdVisible.value ? -4 : isLookingAtEachOther.value ? -4 : undefined
);

// 橙色角色
const orangeStyle = computed(() => {
  if (loginFailed.value) return { transform: 'skewX(-4deg)' };
  return { transform: isPwdVisible.value ? 'skewX(0deg)' : `skewX(${orangePos.value.bodySkew}deg)` };
});

const orangeEyesStyle = computed(() => {
  if (loginFailed.value) return { left: '95px', top: '85px', gap: '32px' };
  const x = isPwdVisible.value ? 50 : 82 + orangePos.value.faceX;
  const y = isPwdVisible.value ? 85 : 90 + orangePos.value.faceY;
  return { left: `${x}px`, top: `${y}px`, gap: '32px' };
});

const orangeForceLookX = computed(() => isPwdVisible.value ? -5 : undefined);
const orangeForceLookY = computed(() => isPwdVisible.value ? -4 : undefined);

// 黄色角色
const yellowStyle = computed(() => {
  if (loginFailed.value) return { transform: 'skewX(-3deg)' };
  return { transform: isPwdVisible.value ? 'skewX(0deg)' : `skewX(${yellowPos.value.bodySkew}deg)` };
});

const yellowEyesStyle = computed(() => {
  if (loginFailed.value) return { left: '55px', top: '38px', gap: '24px' };
  const x = isPwdVisible.value ? 20 : 52 + yellowPos.value.faceX;
  const y = isPwdVisible.value ? 35 : 40 + yellowPos.value.faceY;
  return { left: `${x}px`, top: `${y}px`, gap: '24px' };
});

const yellowForceLookX = computed(() => isPwdVisible.value ? -5 : undefined);
const yellowForceLookY = computed(() => isPwdVisible.value ? -4 : undefined);

const yellowMouthStyle = computed(() => {
  const x = isPwdVisible.value ? 10 : 40 + yellowPos.value.faceX;
  const y = isPwdVisible.value ? 88 : 88 + yellowPos.value.faceY;
  return { left: `${x}px`, top: `${y}px` };
});
</script>

<style scoped>
.characters-container {
  position: relative;
  width: 550px;
  height: 400px;
}

.character {
  position: absolute;
  bottom: 0;
  transition: all 0.7s ease-in-out;
  transform-origin: bottom center;
}

.purple {
  left: 70px;
  width: 180px;
  height: 400px;
  background: #6C3FF5;
  border-radius: 10px 10px 0 0;
  z-index: 1;
}

.black-char {
  left: 240px;
  width: 120px;
  height: 310px;
  background: #2D2D2D;
  border-radius: 8px 8px 0 0;
  z-index: 2;
}

.orange {
  left: 0;
  width: 240px;
  height: 200px;
  background: #FF9B6B;
  border-radius: 120px 120px 0 0;
  z-index: 3;
}

.yellow {
  left: 310px;
  width: 140px;
  height: 230px;
  background: #E8D754;
  border-radius: 70px 70px 0 0;
  z-index: 4;
}

.eyes-container {
  position: absolute;
  display: flex;
  transition: all 0.7s ease-in-out;
}

.pupils-only {
  transition: all 0.2s ease-out;
}

.mouth {
  position: absolute;
  width: 80px;
  height: 4px;
  background: #2D2D2D;
  border-radius: 9999px;
  transition: all 0.2s ease-out;
}

/* 大笑状态 */
.laughing {
  animation: laughShake 0.3s ease-in-out infinite alternate;
}

@keyframes laughShake {
  from { transform: translateY(0) skewX(-3deg); }
  to { transform: translateY(-4px) skewX(-5deg); }
}

.laugh-eye {
  font-size: 22px;
  font-weight: 900;
  color: #2D2D2D;
  line-height: 1;
}

.laugh-eye-white {
  color: #fff;
}

.laugh-mouth {
  position: absolute;
  font-size: 28px;
  color: #2D2D2D;
  line-height: 1;
  animation: laughMouth 0.4s ease-in-out infinite alternate;
}

@keyframes laughMouth {
  from { transform: scale(1); }
  to { transform: scale(1.15); }
}

.purple-mouth {
  left: 60px;
  top: 65px;
  color: #fff;
  font-size: 56px;
}

.black-mouth {
  left: 38px;
  top: 52px;
  color: #fff;
  font-size: 44px;
}

.orange-mouth {
  left: 95px;
  top: 110px;
  color: #2D2D2D;
  font-size: 44px;
}

.yellow-mouth {
  left: 55px;
  top: 64px;
  color: #2D2D2D;
  font-size: 44px;
}
</style>
