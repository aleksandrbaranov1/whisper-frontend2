<script setup>
const props = defineProps({
  chat: Object,
});
function getOtherParticipantName(participants) {
  if (!participants || !Array.isArray(participants)) return "Неизвестный";
  const other = participants[0];
  return other ? other.name : "Неизвестный";
}
</script>

<template>
  <div class="chat-window">
    <div class="chat-header">
      <h1>
        Чат с
        {{ chat ? getOtherParticipantName(chat.participants) : "Выберите чат" }}
      </h1>
    </div>
    <div class="chat-body">
      <pre>{{ chat }}</pre>
    </div>
    <div class="chat-input-container">
      <textarea
        class="chat-input"
        placeholder="Введите сообщение..."
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.chat-window {
  width: 973px;
  height: 100vh;
  border-right: 1px solid black;
  display: flex;
  flex-direction: column;
}

.chat-header {
  height: 71px;
  border-bottom: 1px solid black;
  padding: 10px 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f9f9f9;
}

.chat-input-container {
  height: 65px;
  padding: 7.5px 20px;
  box-sizing: border-box;
  border: 1px solid black;
  border-radius: 20px;
  padding-left: 9px;
}

.chat-input {
  height: 50px;
  width: 883px;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 20px;
  resize: none;
}
</style>
