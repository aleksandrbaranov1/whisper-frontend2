<script setup>
import progileLogo from "@/assets/profileLogo2.svg";
import participantProgileLogo from "@/assets/profileLogo.svg";
import sidebarNotSelectedNotRead from "@/assets/sidebarNotSelectedNotRead.svg";
import sidebarNotSelectedRead from "@/assets/sidebarNotSelectedRead.svg";
import sidebarSelectedNotRead from "@/assets/sidebarSelectedNotRead.svg";
import sidebarSelectedRead from "@/assets/sidebarSelectedRead.svg";

import { ref, onMounted, watch, onBeforeUnmount, computed } from "vue";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

const search = ref("");
const chats = ref([]);
const selectedChat = ref(null);
const currentUserId = ref(null);
let stompClient = null;
const subscriptions = new Map();

const emit = defineEmits(["chat-selected"]);

// новые состояния для поиска пользователей
const userSearchResults = ref([]); // ожидается List<String> от /api/chats/searchUsers
const isSearchingUsers = ref(false);
let searchTimeout = null;

const loadMessages = async (chatId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`/messages/chat/${chatId}`, {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) {
    console.error("Не удалось загрузить сообщения");
    return [];
  }
  return await res.json();
};

const fetchChats = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/chats/my", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("Ошибка загрузки чатов");
  chats.value = await res.json();
};

// функция поиска пользователей на сервере
const fetchUsersByQuery = async (q) => {
  if (!q || q.trim().length < 2) {
    userSearchResults.value = [];
    return;
  }
  isSearchingUsers.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `/api/chats/searchUsers?name=${encodeURIComponent(q)}`,
      { headers: { Authorization: "Bearer " + token } }
    );
    if (!res.ok) {
      userSearchResults.value = [];
      return;
    }
    // ожидаем массив строк (имен)
    userSearchResults.value = await res.json();
  } catch (e) {
    console.error("Ошибка поиска пользователей", e);
    userSearchResults.value = [];
  } finally {
    isSearchingUsers.value = false;
  }
};

const subscribeToChat = (chatId) => {
  if (!stompClient || !stompClient.connected) return;

  if (subscriptions.has(chatId)) {
    // Уже подписаны
    return;
  }

  const subscription = stompClient.subscribe(
    `/topic/chat.${chatId}`,
    (message) => {
      const newMessage = JSON.parse(message.body);
      console.log("Получено сообщение:", newMessage);
      const chatToUpdateIndex = chats.value.findIndex(
        (c) => c.id === newMessage.chatId
      );
      if (chatToUpdateIndex === -1) return;

      // Создаём новый объект чата с обновленным lastMessage
      const updatedChat = {
        ...chats.value[chatToUpdateIndex],
        lastMessage: {
          content: newMessage.content,
          timestamp: newMessage.timestamp,
          senderId: newMessage.senderId,
          isRead: newMessage.isRead,
        },
      };

      // Обновляем массив, перемещая обновлённый чат в начало
      chats.value = [
        updatedChat,
        ...chats.value.filter((c) => c.id !== updatedChat.id),
      ];

      // Если обновился выбранный чат, обновляем selectedChat тоже (чтобы реактивность сработала)
      if (selectedChat.value && selectedChat.value.id === updatedChat.id) {
        selectedChat.value = updatedChat;
      }
    }
  );

  subscriptions.set(chatId, subscription);
};

const unsubscribeFromAll = () => {
  subscriptions.forEach((sub) => sub.unsubscribe());
  subscriptions.clear();
};

const connectWebSocket = () => {
  const socket = new SockJS("/ws");
  stompClient = Stomp.over(socket);
  stompClient.debug = null;

  stompClient.connect({}, () => {
    // Подписываемся на все чаты
    chats.value.forEach((chat) => subscribeToChat(chat.id));
  });
};

// Отправка запроса на сервер о том, что чат прочитан
const markChatAsRead = async (chat) => {
  try {
    const messages = await loadMessages(chat.id);
    const messageIds = messages.map((msg) => msg.id);

    if (messageIds.length === 0) {
      console.log("Нет сообщений для отметки как прочитанных");
      return;
    }

    const token = localStorage.getItem("token");
    const res = await fetch("/messages/mark-read", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId: chat.id,
        messageIds,
      }),
    });

    if (!res.ok) {
      console.warn("Не удалось отметить чат как прочитанный");
      return;
    }

    console.log("Чат отмечен как прочитанный");

    // Можно локально обновить chat.lastMessage.isRead и/или сообщения, если хочешь
  } catch (error) {
    console.error("Ошибка при отметке чата как прочитанного", error);
  }
};

onMounted(async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/profile/me", {
    headers: { Authorization: "Bearer " + token },
  });

  if (res.ok) {
    const profile = await res.json();
    currentUserId.value = profile.id;
  }

  await fetchChats();
  connectWebSocket();
});

watch(chats, (newChats) => {
  if (stompClient && stompClient.connected) {
    // Отписываемся от старых
    unsubscribeFromAll();

    // Подписываемся на новые
    newChats.forEach((chat) => subscribeToChat(chat.id));
  }
});

onBeforeUnmount(() => {
  unsubscribeFromAll();
  if (stompClient) {
    stompClient.disconnect();
  }
});

// Изменённая функция выбора чата — теперь вызывает markChatAsRead
function selectChat(chat) {
  selectedChat.value = chat;
  emit("chat-selected", chat);
  markChatAsRead(chat);
}

function getOtherParticipantName(participants) {
  if (!currentUserId.value) return "";
  const other = participants.find((p) => p.id !== currentUserId.value);
  return other ? other.name : "Неизвестный";
}

function getLastMessage(chat) {
  if (chat.lastMessage && chat.lastMessage.content) {
    return chat.lastMessage.content;
  }
  return "Нет сообщений";
}

function getLastMessageTime(chat) {
  if (!chat.lastMessage || !chat.lastMessage.timestamp) return "";
  const timestamp = chat.lastMessage.timestamp;
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Иконка статуса прочтения
function getReadStatusIcon(chat) {
  const message = chat.lastMessage;
  if (!message) return null;

  const isFromCurrentUser = message.senderId === currentUserId.value;
  if (!isFromCurrentUser) return null;

  const isRead = message.isRead;
  const isSelected = selectedChat.value && selectedChat.value.id === chat.id;

  if (isSelected) {
    return isRead ? sidebarSelectedRead : sidebarSelectedNotRead;
  } else {
    return isRead ? sidebarNotSelectedRead : sidebarNotSelectedNotRead;
  }
}

// дебаунс поиска — следим за search
watch(
  () => search.value,
  (val) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = val ? val.trim() : "";
      if (q.length >= 2) {
        fetchUsersByQuery(q);
      } else {
        userSearchResults.value = [];
      }
    }, 350);
  }
);

// объединённый список для отображения: сначала совпадающие чаты, затем найденные пользователи (если для них ещё нет чата)
const displayedList = computed(() => {
  const q = search.value.trim().toLowerCase();
  const chatMatches = !q
    ? chats.value
    : chats.value.filter((chat) =>
        getOtherParticipantName(chat.participants).toLowerCase().includes(q)
      );

  const userItems = (userSearchResults.value || [])
    .filter((name) => {
      if (!name) return false;
      // исключаем пользователей, у которых уже есть чат (по совпадению имени собеседника)
      return !chatMatches.some(
        (c) =>
          getOtherParticipantName(c.participants).toLowerCase() ===
          name.toLowerCase()
      );
    })
    .map((name) => ({
      id: `user-${name}`,
      isUserResult: true,
      name,
    }));

  return [...chatMatches, ...userItems];
});

// создание приватного чата по имени пользователя (использует backend POST /api/chats/private?user2Name=...)
const createPrivateChatWithName = async (userName) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `/api/chats/private?user2Name=${encodeURIComponent(userName)}`,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      }
    );
    if (!res.ok) {
      console.warn("Не удалось создать приватный чат");
      return;
    }
    const newChat = await res.json();
    // добавляем в начало списка чатов и выбираем его
    chats.value = [newChat, ...chats.value.filter((c) => c.id !== newChat.id)];
    // подписываемся на новый чат, если есть ws
    if (stompClient && stompClient.connected) subscribeToChat(newChat.id);
    selectChat(newChat);
  } catch (e) {
    console.error("Ошибка создания приватного чата", e);
  }
};

function onItemClick(item) {
  if (item && item.isUserResult) {
    createPrivateChatWithName(item.name);
  } else {
    selectChat(item);
  }
}
</script>

<template>
  <div class="chats-sidebar">
    <div class="sidebar-header">
      <div>
        <button class="profile-button">
          <img
            :src="progileLogo"
            alt="Профиль"
            style="width: 33px; height: 20px"
          />
        </button>
      </div>
      <div>
        <textarea class="input" placeholder="Поиск" v-model="search"></textarea>
      </div>
    </div>
    <div class="chat-list">
      <div
        class="chat-item"
        v-for="item in displayedList"
        :key="item.id"
        :class="{
          selected:
            !item.isUserResult && selectedChat && selectedChat.id === item.id,
        }"
        @click="onItemClick(item)"
      >
        <img
          :src="participantProgileLogo"
          alt="Профиль"
          style="width: 80px; height: 80px"
        />
        <div class="chat-item-info">
          <div class="chat-item-title">
            {{
              item.isUserResult
                ? item.name
                : getOtherParticipantName(item.participants)
            }}
          </div>
          <div class="chat-item-last">
            {{ item.isUserResult ? "Начать чат" : getLastMessage(item) }}
          </div>
        </div>
        <div class="last-message-time-wrapper">
          <template v-if="!item.isUserResult && getReadStatusIcon(item)">
            <img
              :src="getReadStatusIcon(item)"
              alt="Статус прочтения"
              style="width: 20px; height: 20px; margin-right: 5px"
            />
          </template>
          <div class="last-message-time">
            {{ item.isUserResult ? "" : getLastMessageTime(item) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chats-sidebar {
  width: 467px;
  height: 100vh;
  background-color: white;
  border-right: 1px solid gray;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  width: 100%;
  height: 90px;
  background-color: white;
  border-right: 1px solid gray;
  border-bottom: 1px solid gray;
  align-items: center;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
.profile-button {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  padding: 0;
  background-color: white;
  border: none;
}
.profile-button img {
  margin-top: 4px;
}
.find-chat-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-left: 45px;
  background-color: rgb(217, 217, 217);
  border: 1px solid black;
}
.buttons-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.chat-list {
  flex: 1 1 auto;
  overflow-y: scroll;
  padding: 0 10px;
  margin-top: 10px;
  position: relative;
}
.chat-item {
  padding: 10px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  box-sizing: border-box;
  width: 100%;
  height: 90px;
  padding-bottom: 12px;
  display: flex;
  position: relative;
  border: 1px solid gray;
  margin-bottom: 3px;
}
.chat-item:hover {
  background-color: rgb(230, 230, 230);
}
.selected {
  background-color: rgb(66, 82, 204);
}
.chat-item.selected:hover {
  background-color: rgb(66, 82, 204);
}
.chat-item-title {
  color: black;
  font-size: 24px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
  margin-left: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.chat-item-last {
  color: black;
  font-size: 24px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
  margin-left: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.unread-badge {
  background-color: rgb(0, 123, 255);
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  margin-left: 10px;
}
.chat-item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  max-width: calc(100% - 110px);
}
.chat-item img {
  margin-top: -5px;
  width: 80px;
  height: 80px;
}
.last-message-time-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: absolute;
  top: 10px;
  right: 10px;
}
.last-message-time {
  color: black;
  font-size: 20px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
}
.chat-item.selected .chat-item-title,
.chat-item.selected .chat-item-last,
.chat-item.selected .last-message-time {
  color: #fff;
}
.input {
  resize: none;
  width: 394px;
  height: 55px;
  background-color: rgb(217, 217, 217);
  font-size: 20px;
  color: rgb(120, 114, 114);
  padding-top: 10px;
  padding-bottom: 10px;
  box-sizing: border-box;
  padding-left: 20px;
  margin-bottom: 31px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
  border-radius: 20px;
  margin-top: 35px;
  margin-left: 15px;
}
</style>
