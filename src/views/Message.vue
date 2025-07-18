<script setup>
import { computed } from "vue";
import readLogo from "@/assets/readLogo.svg";
import notReadLogo from "@/assets/notReadLogo.svg";

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
    <div class="message-bubble" :data-id="message.id">
      {{ content }}
      <span class="message-time">
        {{ formattedTime }}
        <img
          v-if="isFromMe"
          :src="message.isRead ? readLogo : notReadLogo"
          alt="Read status"
          class="read-status-icon"
        />
      </span>
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
  padding: 8px 12px 12px 12px;
  border-radius: 20px;
  border-bottom-left-radius: 0;
  position: relative;
  display: inline-block;
  word-break: break-word;
  line-height: 1.4;
  min-width: 80px;
  max-width: 100%;
  box-sizing: border-box;
}

.from-me .message-bubble {
  background-color: rgb(66, 82, 204);
  color: white;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 20px;
  padding: 8px 12px 12px 12px;
}

.message-time {
  position: static;
  font-size: 12px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 6px;
}

.from-them .message-time {
  color: gray;
}
</style>
