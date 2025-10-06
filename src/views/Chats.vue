<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import ChatsSidebar from "@/views/ChatsSidebar.vue";
import Chat from "@/views/Chat.vue";

const selectedChat = ref(null);

function handleChatSelect(chat) {
  selectedChat.value = chat;
}

const isMobile = ref(window.innerWidth <= 768);

function updateIsMobile() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
  window.addEventListener("resize", updateIsMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateIsMobile);
});
</script>

<template>
  <div class="main-container">
    <!-- Показываем сайдбар только если чат не выбран на мобильных -->
    <ChatsSidebar
      v-if="!(isMobile && selectedChat)"
      class="chats-sidebar"
      @chat-selected="handleChatSelect"
    />

    <!-- Показываем чат только если выбран чат на мобильных -->
    <Chat
      v-if="!(isMobile && !selectedChat)"
      :chat="selectedChat"
      class="chat-window"
      @exit-chat="selectedChat = null"
    />
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

/* Мобильный стиль */
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }
  .chats-sidebar {
    width: 100vw;
  }
  .chat-window {
    width: 100vw;
    height: 100vh;
  }
}
</style>
