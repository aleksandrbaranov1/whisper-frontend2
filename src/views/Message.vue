<script setup>
const props = defineProps({
  content: String,
  isFromMe: Boolean,
  message: Object,
});
const emit = defineEmits(["contextmenu"]);

function onRightClick(event) {
  emit("contextmenu", { event, message: props.message });
}
</script>

<template>
  <div
    :class="['message-container', isFromMe ? 'from-me' : 'from-them']"
    @contextmenu.prevent="onRightClick"
  >
    <p class="message-text">{{ content }}</p>
  </div>
</template>

<style scoped>
.message-container {
  max-width: 60%;
  margin: 5px 10px;
  padding: 2px 10px;
  border-radius: 20px;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-family: "Mallanna", sans-serif;
  font-size: 16px;
}

.from-me {
  align-self: flex-end;
  background-color: rgb(66, 82, 204);
  color: white;
  border-bottom-right-radius: 0;
}

.from-them {
  align-self: flex-start;
  background-color: #e5e5ea;
  color: black;
  border-bottom-left-radius: 0;
}
</style>
