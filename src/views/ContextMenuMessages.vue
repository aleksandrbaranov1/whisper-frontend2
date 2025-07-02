<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="context-menu"
    :style="{ top: y + 'px', left: x + 'px' }"
  >
    <div class="context-menu-content">
      <ul>
        <li @click="emitAction('edit')" class="edit-item">
          <img
            :src="editLogo"
            alt="Редактировать"
            style="width: 20px; height: 20px; margin-right: 8px"
          />
          Редактировать
        </li>
        <li @click="emitAction('delete')" class="delete-item">
          <img
            :src="deleteLogo"
            alt="Удалить сообщение"
            style="width: 20px; height: 20px; margin-right: 8px"
          />
          Удалить
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import deleteLogo from "@/assets/deleteLogo.svg";
import editLogo from "@/assets/editMessageLogo.svg";
import { ref, nextTick } from "vue";

const emit = defineEmits(["action"]);

const x = ref(0);
const y = ref(0);
const visible = ref(false);
const menuRef = ref(null);
const currentMessage = ref(null);

function show(event, message) {
  event.preventDefault();
  x.value = event.clientX;
  y.value = event.clientY;
  currentMessage.value = message;
  visible.value = true;

  nextTick(() => {
    const menu = menuRef.value;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const overflowRight = rect.right - window.innerWidth;
    const overflowBottom = rect.bottom - window.innerHeight;

    if (overflowRight > 0) {
      x.value -= overflowRight + 10;
      if (x.value < 0) x.value = 0;
    }

    if (overflowBottom > 0) {
      y.value -= overflowBottom + 10;
      if (y.value < 0) y.value = 0;
    }
  });

  document.addEventListener("click", hide);
}

function hide() {
  visible.value = false;
  document.removeEventListener("click", hide);
}

function emitAction(action) {
  emit("action", { action, message: currentMessage.value });
  hide();
}

defineExpose({ show });
</script>

<style scoped>
.context-menu {
  position: absolute;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 20px;
  width: 170px;
  height: 80px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  background-color: rgb(217, 217, 217);
  font-family: "Mallanna", sans-serif;
  font-size: 15px;
  overflow: hidden;
}

.context-menu ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.context-menu li {
  cursor: pointer;
  width: 100%; /* Полная ширина меню */
  height: 40px;
  border-radius: 20px;
  padding-left: 16px;
  text-align: left;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.context-menu li:hover {
  background-color: rgb(234, 232, 232);
}

.context-menu li img {
  margin-right: 8px;
  flex-shrink: 0;
}

.delete-item {
  color: red;
}
</style>
