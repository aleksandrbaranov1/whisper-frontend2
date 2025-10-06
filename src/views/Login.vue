<script setup>
import logo from "@/assets/whisperLogo.svg";
import { ref } from "vue";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const router = useRouter();

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
    if (!response.ok) {
      throw new Error(await response.text());
    }
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
      <h1>Вход</h1>

      <textarea
        class="input"
        placeholder="Электронная почта"
        v-model="email"
      ></textarea>

      <div class="password-wrapper">
        <input
          :type="showPassword ? 'text' : 'password'"
          class="input password-input"
          placeholder="Пароль"
          v-model="password"
        />
        <button
          v-if="password.length > 0"
          type="button"
          class="toggle-btn"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? "Скрыть" : "Показать" }}
        </button>
      </div>

      <button class="register-button" @click="login">Войти</button>

      <p>Нет аккаунта? <a href="/register">Зарегистрироваться</a></p>
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

.password-wrapper {
  display: flex;
  width: 466px;
  position: relative;
  align-items: center;
}

.password-input {
  flex-grow: 1;
  padding-right: 80px;
}

.toggle-btn {
  position: absolute;
  right: 20px;
  background: none;
  border: none;
  color: rgb(66, 82, 204);
  font-size: 16px;
  cursor: pointer;
  font-family: "Mallanna", sans-serif;
  display: flex;
  align-items: center;
  height: 100%;
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

@media (max-width: 768px) {
  .registration-container {
    width: 90%;
    padding: 20px;
  }

  .input {
    width: 100%;
    height: 50px;
    font-size: 16px;
  }

  .register-button {
    width: 100%;
    height: 50px;
    font-size: 18px;
  }

  .password-wrapper {
    width: 100%;
  }

  .toggle-btn {
    font-size: 14px;
    right: 10px;
  }
}

@media (max-width: 480px) {
  h1 {
    font-size: 28px;
  }

  .input {
    font-size: 14px;
    height: 45px;
  }

  .register-button {
    font-size: 16px;
    height: 45px;
  }

  p,
  a {
    font-size: 14px;
  }
}
@media (max-width: 768px) {
  .logo-wrapper {
    display: none;
  }
}
</style>
