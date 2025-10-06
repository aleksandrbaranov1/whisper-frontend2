<script setup>
window.global = window;

import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import sendMessageIcon from "@/assets/sendMessageIcon.svg";
import ChatPlaceholder from "@/views/ChatPlaceholder.vue";
import Message from "@/views/Message.vue";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import ContextMenu from "@/views/ContextMenuMessages.vue";

const contextMenuRef = ref();
const props = defineProps({
  chat: Object,
});
const emit = defineEmits(["exit-chat"]);

const companion = ref(null);
const messages = ref([]);
const messageInput = ref("");
const client = new Client();
const subscription = ref(null);
const senderId = ref(null);

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const id = parseInt(entry.target.dataset.id);
        const msg = messages.value.find((m) => m.id === id);
        if (msg && !msg.isRead && msg.senderId !== senderId.value) {
          markMessageAsRead(id);
        }
      }
    }
  },
  { threshold: 1.0 }
);

function markMessageAsRead(messageId) {
  const token = localStorage.getItem("token");
  fetch(`/messages/mark-read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chatId: props.chat.id,
      messageIds: [messageId],
    }),
  })
    .then(() => {
      console.log("Marked as read:", messageId);
    })
    .catch((err) => {
      console.error("Error marking as read:", err);
    });
}

watch(messages, () => {
  nextTick(() => {
    document
      .querySelectorAll(".message-bubble[data-id]")
      .forEach((el) => observer.observe(el));
  });
});

onBeforeUnmount(() => {
  observer.disconnect();
});

watch(
  () => props.chat,
  async (newChat) => {
    if (newChat) {
      try {
        const token = localStorage.getItem("token");

        const responseCompanion = await fetch(
          `/api/chats/getCompanion/${newChat.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!responseCompanion.ok)
          throw new Error("Ошибка при загрузке собеседника");
        companion.value = await responseCompanion.json();

        const responseMessages = await fetch(`/messages/chat/${newChat.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!responseMessages.ok)
          throw new Error("Ошибка при загрузке сообщений");
        messages.value = await responseMessages.json();

        if (client.active) {
          subscribeToChat(newChat.id);
          subscribeToDeletedMessages(newChat.id);
          subscribeToReadMessages(newChat.id);
        }
      } catch (error) {
        console.error("Ошибка:", error);
      }
    } else {
      messages.value = [];
      companion.value = null;
      unsubscribeFromChat();
    }
  },
  { immediate: true }
);

const sendMessage = async () => {
  const content = messageInput.value.trim();
  if (!content || !props.chat) return;

  try {
    const token = localStorage.getItem("token");
    const messageDTO = {
      content: content,
      chatId: props.chat.id,
      senderId: senderId.value,
    };

    const response = await fetch("/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageDTO),
    });

    if (!response.ok) throw new Error("Ошибка при отправке сообщения");
    messageInput.value = "";
  } catch (error) {
    console.error("Ошибка при отправке сообщения:", error);
  }
};

const handleEnterKey = (event) => {
  if (event.shiftKey) return;
  event.preventDefault();
  sendMessage();
};

function subscribeToChat(chatId) {
  unsubscribeFromChat();
  subscription.value = client.subscribe(`/topic/chat.${chatId}`, (msg) => {
    const receivedMessage = JSON.parse(msg.body);
    messages.value.push(receivedMessage);

    nextTick(() => {
      const el = document.querySelector(
        `.message-bubble[data-id="${receivedMessage.id}"]`
      );
      if (el) {
        observer.observe(el);
      }
    });
  });
}

function subscribeToDeletedMessages(chatId) {
  client.subscribe(`/topic/chats/${chatId}/deleted`, (msg) => {
    const { messageId } = JSON.parse(msg.body);
    messages.value = messages.value.filter((m) => m.id !== messageId);
  });
}

function subscribeToReadMessages(chatId) {
  client.subscribe(`/topic/chats/${chatId}/read`, (msg) => {
    const { messageIds } = JSON.parse(msg.body);
    messages.value = messages.value.map((msg) =>
      messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
    );
  });
}

function unsubscribeFromChat() {
  if (subscription.value) {
    subscription.value.unsubscribe();
    subscription.value = null;
  }
}

onMounted(async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/user/getUserIdl", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Не удалось получить ID пользователя");
    const rawText = await response.text();
    senderId.value = parseInt(rawText);

    client.webSocketFactory = () => new SockJS("/ws");
    client.onConnect = () => {
      if (props.chat) {
        const chatId = props.chat.id;
        subscribeToChat(chatId);
        subscribeToDeletedMessages(chatId);
        subscribeToReadMessages(chatId);
      }
    };
    client.onStompError = (frame) => {
      console.error("STOMP ошибка: ", frame.headers["message"]);
    };
    client.activate();
  } catch (error) {
    console.error("Ошибка при инициализации:", error);
  }
});

onBeforeUnmount(() => {
  unsubscribeFromChat();
  client.deactivate();
});

function handleMessageContextMenu({ event, message }) {
  contextMenuRef.value?.show(event, message);
}

function handleContextAction({ action, message }) {
  if (action === "delete") {
    deleteMessage(message.id);
  } else if (action === "edit") {
    console.log("Редактировать сообщение:", message);
  }
}

async function deleteMessage(messageId) {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `/messages/delete/${props.chat.id}/${messageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) throw new Error("Ошибка при удалении");
    messages.value = messages.value.filter((msg) => msg.id !== messageId);
  } catch (error) {
    console.error("Ошибка при удалении сообщения:", error);
  }
}

function exitChat() {
  emit("exit-chat");
}
</script>

<template>
  <div v-if="props.chat" class="chat-window">
    <header class="chat-header">
      <h1>{{ companion?.name || "Неизвестен" }}</h1>
      <button class="exit-chat-button" @click="exitChat">×</button>
    </header>

    <main class="chat-body">
      <Message
        v-for="msg in messages"
        :key="msg.id + '-' + (msg.isRead ? 'read' : 'unread')"
        :content="msg.content"
        :isFromMe="msg.senderId === senderId"
        :message="msg"
        @contextmenu="handleMessageContextMenu"
      />
    </main>

    <ContextMenu ref="contextMenuRef" @action="handleContextAction" />

    <footer class="chat-input-container">
      <textarea
        class="chat-input"
        v-model="messageInput"
        placeholder="Сообщение"
        @keydown.enter="handleEnterKey"
      ></textarea>
      <button class="send-button" @click="sendMessage">
        <img
          :src="sendMessageIcon"
          alt="Отправить сообщение"
          width="21"
          height="24"
        />
      </button>
    </footer>
  </div>

  <ChatPlaceholder v-else />
</template>

<style scoped>
.chat-window {
  width: 973px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-right: 1px solid black;
  background-color: #fff;
}

.chat-header {
  height: 90px;
  border-bottom: 1px solid gray;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.chat-header h1 {
  font-size: 24px;
  font-weight: 400;
  font-family: "Mallanna", sans-serif;
  color: black;
}

.exit-chat-button {
  background: transparent;
  border: none;
  font-size: 24px;
  font-weight: bold;
  color: black;
  cursor: pointer;
  margin-left: auto;
  padding: 0 10px;
}

.exit-chat-button:hover {
  color: red;
}

.chat-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-input-container {
  display: flex;
  align-items: center;
  padding: 7.5px 20px;
  border: 1px solid black;
  border-radius: 20px;
  margin: 10px 20px;
  height: 65px;
  background-color: white;
  box-sizing: border-box;
}

.chat-input {
  flex-grow: 1;
  height: 50px;
  padding: 10px 20px;
  font-size: 18px;
  font-family: "Mallanna", sans-serif;
  border-radius: 20px;
  border: 1px solid #ccc;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.send-button {
  width: 50px;
  height: 50px;
  margin-left: 15px;
  border: none;
  border-radius: 50%;
  background-color: rgb(66, 82, 204);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.send-button img {
  display: block;
}
</style>
