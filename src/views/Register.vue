<script setup>
import logo from "@/assets/whisperLogo.svg";
import { ref } from "vue";
import { useRouter } from "vue-router";

const username = ref("");
const email = ref("");
const password = ref("");
const code = ref("");
const step = ref(1); // Этап регистрации
const router = useRouter();

async function requestCode() {
  try {
    const response = await fetch("/api/auth/register/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: username.value,
        email: email.value,
        password: password.value,
        role: "ROLE_USER",
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    alert("Код отправлен на почту");
    step.value = 2;
  } catch (error) {
    alert(error.message);
  }
}

async function confirmRegistration() {
  try {
    const response = await fetch("/api/auth/register/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: username.value,
        email: email.value,
        password: password.value,
        code: code.value,
        role: "ROLE_USER",
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    await login();
  } catch (error) {
    alert(error.message);
  }
}

async function login() {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    localStorage.setItem("token", data.token);
    router.push("/chats");
  } catch (error) {
    alert(error.message);
  }
}
</script>

<template>
  <div class="logo-wrapper">
    <img :src="logo" alt="Logo" class="logo" />
  </div>

  <div class="center-wrapper">
    <div class="registration-container">
      <h1>Регистрация</h1>

      <textarea
        class="input"
        placeholder="Имя пользователя"
        v-model="username"
      ></textarea>
      <textarea
        class="input"
        placeholder="Электронная почта"
        v-model="email"
      ></textarea>
      <textarea
        class="input"
        placeholder="Пароль"
        v-model="password"
      ></textarea>

      <!-- Блок для шагов -->
      <div class="step-block" v-if="step === 1">
        <button class="register-button" @click="requestCode">
          Получить код подтверждения
        </button>
      </div>

      <div class="step-block" v-if="step === 2">
        <textarea
          class="input"
          placeholder="Код подтверждения"
          v-model="code"
        ></textarea>
        <button class="register-button" @click="confirmRegistration">
          Подтвердить регистрацию
        </button>
      </div>

      <p>Уже есть аккаунт? <a href="/login">Войти</a></p>
    </div>
  </div>
</template>

<style scoped>
.logo-wrapper {
  position: absolute;
  top: 50px;
  left: 50px;
}

.center-wrapper {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.registration-container {
  width: 608px;
  min-height: 560px;
  background-color: rgb(248, 245, 245);
  align-items: center;
  display: flex;
  flex-direction: column;
  padding-top: 41px;
  box-sizing: border-box;
  border-radius: 20px;
}

/* Добавлен новый класс для выравнивания шагов */
.step-block {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center; /* центрирует поле и кнопку */
}

h1 {
  font-size: 40px;
  font-family: "Mallanna", sans-serif;
  color: rgb(66, 82, 204);
  text-align: center;
  margin-bottom: 51px;
  font-weight: 400;
}

.input {
  resize: none;
  width: 466px;
  height: 60px;
  background-color: rgb(217, 217, 217);
  font-size: 20px;
  color: rgb(120, 114, 114);
  padding: 10px 20px;
  margin-bottom: 31px;
  box-sizing: border-box;
  border: none;
  border-radius: 10px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
}

.register-button {
  background-color: rgb(66, 82, 204);
  width: 466px;
  height: 60px;
  font-size: 20px;
  color: white;
  margin-bottom: 31px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
  transition: background-color 0.3s;
}

.register-button:hover {
  background-color: rgb(56, 72, 184);
}

p {
  margin-top: 0;
  font-size: 20px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
}

a {
  color: rgb(66, 82, 204);
  font-size: 20px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
