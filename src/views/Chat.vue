<script setup>
window.global = window;

import { ref, watch, onMounted, onBeforeUnmount } from "vue";
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

const companion = ref(null);
const messages = ref([]);
const messageInput = ref("");

const client = new Client();
const subscription = ref(null);

const senderId = ref(null);

watch(
  () => props.chat,
  async (newChat) => {
    console.log("Chat changed:", newChat ? newChat.id : "null");
    if (newChat) {
      try {
        const token = localStorage.getItem("token");

        const responseCompanion = await fetch(
          `http://localhost:8080/api/chats/getCompanion/${newChat.id}`,
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

        const responseMessages = await fetch(
          `http://localhost:8080/messages/chat/${newChat.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!responseMessages.ok)
          throw new Error("Ошибка при загрузке сообщений");
        messages.value = await responseMessages.json();

        console.log("Messages loaded:", messages.value.length);

        if (client.active) {
          console.log("Client active, subscribing to chat:", newChat.id);
          subscribeToChat(newChat.id);
          subscribeToDeletedMessages(newChat.id);
        } else {
          console.log("Client not active yet");
        }
      } catch (error) {
        console.error("Ошибка:", error);
      }
    } else {
      messages.value = [];
      companion.value = null;
      unsubscribeFromChat();
      console.log("Unsubscribed due to chat reset");
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

    const response = await fetch("http://localhost:8080/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageDTO),
    });

    if (!response.ok) throw new Error("Ошибка при отправке сообщения");

    const newMessage = await response.json();

    messages.value.push(newMessage);

    messageInput.value = "";
    console.log("Message sent and appended:", newMessage);
  } catch (error) {
    console.error("Ошибка при отправке сообщения:", error);
  }
};

const handleEnterKey = (event) => {
  if (event.shiftKey) {
    return;
  }

  event.preventDefault();
  sendMessage();
};

function subscribeToChat(chatId) {
  unsubscribeFromChat();
  console.log("Subscribing to topic:", `/topic/chat.${chatId}`);

  subscription.value = client.subscribe(`/topic/chat.${chatId}`, (msg) => {
    console.log("WS message received:", msg.body);
    const receivedMessage = JSON.parse(msg.body);
    messages.value.push(receivedMessage);
  });
}
function subscribeToDeletedMessages(chatId) {
  client.subscribe(`/topic/chats/${chatId}/deleted`, (msg) => {
    const { messageId } = JSON.parse(msg.body);
    messages.value = messages.value.filter((m) => m.id !== messageId);
    console.log("Сообщение удалено через WebSocket:", messageId);
  });
}

function unsubscribeFromChat() {
  if (subscription.value) {
    subscription.value.unsubscribe();
    subscription.value = null;
    console.log("Unsubscribed from chat");
  }
}

onMounted(async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch("http://localhost:8080/api/user/getUserIdl", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Не удалось получить ID пользователя");

    const rawText = await response.text();
    senderId.value = parseInt(rawText);

    console.log("User ID:", senderId.value);

    client.webSocketFactory = () => new SockJS("http://localhost:8080/ws");
    client.onConnect = () => {
      console.log("WebSocket connected");
      if (props.chat) {
        console.log("Subscribing to chat on connect:", props.chat.id);
        subscribeToChat(props.chat.id);
        if (props.chat) {
          subscribeToChat(props.chat.id);
          subscribeToDeletedMessages(props.chat.id);
        }
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
  console.log("Component unmounted, WebSocket deactivated");
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
      `http://localhost:8080/messages/delete/${props.chat.id}/${messageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error("Ошибка при удалении");

    messages.value = messages.value.filter((msg) => msg.id !== messageId);
    console.log("Сообщение удалено локально:", messageId);
  } catch (error) {
    console.error("Ошибка при удалении сообщения:", error);
  }
}
</script>

<template>
  <div v-if="props.chat" class="chat-window">
    <header class="chat-header">
      <h1>{{ companion?.name || "Неизвестен" }}</h1>
    </header>

    <main class="chat-body">
      <Message
        v-for="msg in messages"
        :key="msg.id"
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
