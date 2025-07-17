<script setup>
import { computed } from "vue";

const props = defineProps({
  content: String,
  isFromMe: Boolean,
  message: Object,
});

const emit = defineEmits(["contextmenu"]);

function onRightClick(event) {
  emit("contextmenu", { event, message: props.message });
}

const formattedTime = computed(() => {
  const timestamp = props.message?.timestamp;
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
});
</script>

<template>
  <div
    :class="['message-container', isFromMe ? 'from-me' : 'from-them']"
    @contextmenu.prevent="onRightClick"
  >
    <div class="message-bubble">
      {{ content }}
      <span class="message-time">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<style scoped>
.message-container {
  max-width: 60%;
  margin: 5px 10px;
  display: flex;
  font-family: "Mallanna", sans-serif;
  font-size: 16px;
}

.from-me {
  align-self: flex-end;
}

.from-them {
  align-self: flex-start;
}

.message-bubble {
  background-color: #e5e5ea;
  color: black;
  padding: 8px 36px 18px 12px; /* добавили место под время */
  border-radius: 20px;
  border-bottom-left-radius: 0;
  position: relative;
  display: inline-block;
  word-break: break-word;
  line-height: 1.4;
}

.from-me .message-bubble {
  background-color: rgb(66, 82, 204);
  color: white;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 20px;
}

.message-time {
  position: absolute;
  bottom: 6px;
  right: 12px;
  font-size: 12px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.7);
}

.from-them .message-time {
  color: gray;
}
</style>
