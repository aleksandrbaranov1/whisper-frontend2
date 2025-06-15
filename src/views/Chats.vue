<script setup>
import { ref } from "vue";
import ChatsSidebar from "@/views/ChatsSidebar.vue";
import Chat from "@/views/Chat.vue";

const selectedChat = ref(null);

function handleChatSelect(chat) {
  selectedChat.value = chat;
}
</script>

<template>
  <div class="main-container">
    <ChatsSidebar class="chats-sidebar" @chat-selected="handleChatSelect" />
    <Chat :chat="selectedChat" />
  </div>
</template>

<style scoped>
.chats-sidebar {
  width: 467px;
  height: 100vh;
  background-color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.main-container {
  display: flex;
  height: 100vh;
}
</style>
