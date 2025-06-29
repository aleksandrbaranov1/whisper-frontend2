<script setup>
import progileLogo from "@/assets/profileLogo2.svg";
import participantProgileLogo from "@/assets/profileLogo.svg";
import { ref, onMounted } from "vue";
const search = ref("");
const chats = ref([]);
const selectedChat = ref(null);
const currentUserId = ref(null);

const emit = defineEmits(["chat-selected"]);

const fetchChats = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:8080/api/chats/my", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("Ошибка загрузки чатов");
  chats.value = await res.json();
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
});

function selectChat(chat) {
  selectedChat.value = chat;
  emit("chat-selected", chat);
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
  const timestamp = chat.lastMessage.timestamp;
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
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
        <textarea class="input" placeholder="Поиск" v-model="search">
        </textarea>
      </div>
    </div>
    <div class="chat-list">
      <div
        class="chat-item"
        v-for="chat in chats"
        :key="chat.id"
        :class="{ selected: selectedChat && selectedChat.id === chat.id }"
        @click="selectChat(chat)"
      >
        <img
          :src="participantProgileLogo"
          alt="Профиль"
          style="width: 80px; height: 80px"
        />
        <div class="chat-item-info">
          <div class="chat-item-title">
            {{ getOtherParticipantName(chat.participants) }}
          </div>
          <div class="chat-item-last">
            {{ getLastMessage(chat) }}
          </div>
          <div class="last-message-time">
            {{ getLastMessageTime(chat) }}
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
}
.chat-item-last {
  color: black;
  font-size: 24px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
  margin-left: 10px;
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
}
.chat-item img {
  margin-top: -5px;
}
.last-message-time {
  position: absolute;
  top: 0;
  right: 0;
  color: black;
  font-size: 20px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
  top: 10px;
  right: 10px;
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
