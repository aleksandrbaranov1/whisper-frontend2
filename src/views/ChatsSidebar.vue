<script setup>
import progileLogo from "@/assets/profileLogo2.svg";
import participantProgileLogo from "@/assets/profileLogo.svg";
import sidebarNotSelectedNotRead from "@/assets/sidebarNotSelectedNotRead.svg";
import sidebarNotSelectedRead from "@/assets/sidebarNotSelectedRead.svg";
import sidebarSelectedNotRead from "@/assets/sidebarSelectedNotRead.svg";
import sidebarSelectedRead from "@/assets/sidebarSelectedRead.svg";

import { onMounted, watch, onBeforeUnmount, ref, computed } from "vue";
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
  const res = await fetch(`http://localhost:8080/messages/chat/${chatId}`, {
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
  const res = await fetch("http://localhost:8080/api/chats/my", {
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
      `http://localhost:8080/api/chats/searchUsers?name=${encodeURIComponent(
        q
      )}`,
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
  const socket = new SockJS("http://localhost:8080/ws");
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
    const res = await fetch("http://localhost:8080/messages/mark-read", {
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

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
  if (window.innerWidth <= 768) isSidebarOpen.value = false;
};

// при выборе чата — закрываем сайдбар на мобилке
function selectChat(chat) {
  selectedChat.value = chat;
  emit("chat-selected", chat);
  markChatAsRead(chat);
  closeSidebar();
}

// реакция на изменение размера окна — показываем сайдбар по умолчанию на десктопе
const handleResize = () => {
  if (window.innerWidth > 768) {
    isSidebarOpen.value = true;
  }
};

onMounted(async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:8080/api/profile/me", {
    headers: { Authorization: "Bearer " + token },
  });

  if (res.ok) {
    const profile = await res.json();
    currentUserId.value = profile.id;
  }

  await fetchChats();
  connectWebSocket();
  handleResize();
  window.addEventListener("resize", handleResize);
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
  window.removeEventListener("resize", handleResize);
});

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
      `http://localhost:8080/api/chats/private?user2Name=${encodeURIComponent(
        userName
      )}`,
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
</script>

<template>
  <!-- добавлены классы и оверлей для мобильной версии -->
  <div>
    <div
      class="sidebar-overlay"
      v-if="isSidebarOpen && window && window.innerWidth <= 768"
      @click="toggleSidebar"
    ></div>

    <aside :class="['chats-sidebar', { 'sidebar-open': isSidebarOpen }]">
      <div class="sidebar-header">
        <div class="left-header">
          <button
            class="profile-button"
            @click="toggleSidebar"
            aria-label="toggle sidebar"
          >
            <img
              :src="progileLogo"
              alt="Профиль"
              style="width: 33px; height: 20px"
            />
          </button>
        </div>

        <div class="search-wrapper">
          <!-- заменил textarea на input -->
          <input
            class="input"
            type="search"
            placeholder="Поиск"
            v-model="search"
            aria-label="search"
          />
        </div>

        <button
          class="hamburger"
          @click="toggleSidebar"
          aria-label="menu"
          v-if="window && window.innerWidth <= 768"
        >
          ☰
        </button>
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
            class="chat-avatar"
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
    </aside>
  </div>
</template>

<style scoped>
/* восстановленные/дополнительные стили для сохранения прежнего дизайна + адаптивности */

/* контейнер заголовка */
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* левая часть с аватаром */
.left-header {
  display: flex;
  align-items: center;
}

/* кнопка профиля — убрать дефолтные стили и выровнять */
.profile-button {
  background: transparent;
  border: none;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* обёртка поиска занимает оставшееся пространство */
.search-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
}

/* унифицированный вид поля поиска (раньше было для textarea) */
.input {
  width: 100%;
  max-width: 100%;
  height: 36px;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 14px;
  color: #111;
  background: #fafafa;
  outline: none;
  box-sizing: border-box;
}

/* при фокусе — лёгкий акцент */
.input:focus {
  border-color: rgba(0, 120, 255, 0.7);
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* список чатов */
.chat-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* единица чата — выравнивание, отступы и разделитель */
.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  transition: background 0.12s ease;
}
.chat-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

/* аватар */
.chat-avatar {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: cover;
}

/* блок с текстом */
.chat-item-info {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* заголовок и превью сообщения — обрезаем по ширине */
.chat-item-title {
  font-weight: 600;
  font-size: 15px;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-item-last {
  margin-top: 4px;
  font-size: 13px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* время / иконка справа */
.last-message-time-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex: 0 0 auto;
  margin-left: 8px;
  min-width: 60px;
}
.last-message-time {
  font-size: 12px;
  color: #8a8a8a;
}

/* выделенный чат */
.chat-item.selected {
  background: rgba(0, 120, 255, 0.06);
}

/* мелкие корректировки для мобильной версии (сохранены из патча) */
@media (max-width: 768px) {
  .input {
    height: 40px;
    font-size: 16px;
    padding: 8px 12px;
  }
  .chat-avatar {
    width: 48px;
    height: 48px;
  }
  .chat-item {
    padding: 10px 12px;
  }
  .chat-item-title {
    font-size: 16px;
  }
  .chat-item-last {
    font-size: 14px;
  }
}

/* мобильная и адаптивная логика */
.chats-sidebar {
  width: 467px;
  height: 100vh;
  background-color: white;
  border-right: 1px solid gray;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, width 0.25s ease;
  z-index: 1000;
}

/* overlay для мобильной версии */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 900;
}

/* поведение на мобильных: скрываем по умолчанию (см isSidebarOpen) */
@media (max-width: 768px) {
  .chats-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    max-width: 360px;
    transform: translateX(-110%); /* скрыто */
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.2);
  }

  .chats-sidebar.sidebar-open {
    transform: translateX(0);
  }

  .chat-item {
    height: 76px;
  }

  .chat-item-title {
    font-size: 18px;
  }

  .chat-item-last {
    font-size: 16px;
  }

  .input {
    width: calc(100% - 32px);
    height: 40px;
    font-size: 16px;
    padding: 8px 12px;
    margin-left: 10px;
    margin-top: 16px;
  }

  .chat-avatar {
    width: 48px;
    height: 48px;
  }

  .last-message-time {
    font-size: 14px;
  }

  .sidebar-header {
    height: 70px;
    padding: 8px;
    justify-content: space-between;
  }

  .hamburger {
    background: transparent;
    border: none;
    font-size: 22px;
    margin-right: 8px;
  }
}

/* поведение на планшетах/малых экранах */
@media (max-width: 1024px) and (min-width: 769px) {
  .chats-sidebar {
    width: 360px;
  }
}

/* улучшения для десктопа — уменьшаем, если экран очень узкий */
@media (max-width: 1200px) {
  .chats-sidebar {
    width: 420px;
  }
}
</style>
