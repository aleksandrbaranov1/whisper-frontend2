<script setup>
import { ref, onMounted, watch } from "vue";
import sendMessageIcon from "@/assets/sendMessageIcon.svg";
import ChatPlaceholder from "@/views/ChatPlaceholder.vue";

const props = defineProps({
  chat: Object,
});

const companion = ref(null);

watch(
  () => props.chat,
  async (newChat) => {
    if (newChat) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:8080/api/chats/getCompanion/${newChat.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Ошибка при загрузке собеседника");
        }

        companion.value = await response.json();
        console.log("Собеседник:", companion);
      } catch (error) {
        console.error("Ошибка при получении собеседника:", error);
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="props.chat" class="chat-window">
    <div class="chat-header">
      <div class="header-text-container">
        <h1>{{ companion?.name || "Неизвестен" }}</h1>
      </div>
    </div>
    <div class="chat-body">
      <pre>{{ chat }}</pre>
    </div>
    <div class="chat-input-container">
      <textarea class="chat-input" placeholder="Cообщение"></textarea>
      <div class="send-button-container">
        <button class="send-button">
          <img
            :src="sendMessageIcon"
            alt="Отправить сообщение"
            style="width: 21px; height: 24px"
          />
        </button>
      </div>
    </div>
  </div>
  <ChatPlaceholder v-else />
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
  display: flex;
}

.chat-input {
  height: 50px;
  padding: 5px 10px 30px 30px;
  box-sizing: border-box;
  border-radius: 20px;
  resize: none;
  flex-grow: 1;
  width: auto;
  font-size: 20px;
  font-family: "Mallanna", sans-serif;
  margin-bottom: 10px;
  font-weight: 400;
}
.send-button {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background-color: rgb(66, 82, 204);
}
.send-button-container {
  padding-left: 15px;
}
h1 {
  font-size: 24px;
  font-family: "Mallanna", sans-serif;
  color: black;
  font-weight: 400;
}
</style>
