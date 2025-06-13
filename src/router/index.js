import { createRouter, createWebHistory } from "vue-router";
import Register from "@/views/Register.vue";
import Login from "@/views/Login.vue";
import Chats from "@/views/Chats.vue";

const routes = [
  { path: "/", component: Login }, // заменить на login
  { path: "/register", component: Register },
  { path: "/login", component: Login },
  { path: "/chats", component: Chats },
];
const router = createRouter({
  history: createWebHistory(),
  routes,
});
export default router;
