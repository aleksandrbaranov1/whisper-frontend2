<script setup>
import logo from "@/assets/whisperLogo.svg";
</script>

<template>
  <div class="logo-wrapper">
    <img :src="logo" alt="Logo" class="logo" />
  </div>
  <div class="center-wrapper">
    <div class="registration-container">
      <h1>Регистрация</h1>
      <textarea class="input" placeholder="Имя пользователя"></textarea>
      <textarea class="input" placeholder="Электронная почта"></textarea>
      <textarea class="input" placeholder="Пароль"></textarea>
      <button class="register-button">Создать аккаунт</button>
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
  height: 560px;
  background-color: rgb(248 245 245);
  align-items: center;
  display: flex;
  flex-direction: column;
  /* padding-top: 41px; */
}
h1 {
  font-size: 40px;
  font-family: Mallanna;
  color: rgb(66, 82, 204);
  text-align: center;
  margin-bottom: 51px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
}
.input {
  resize: none;
  width: 466px;
  height: 60px;
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
}
.register-button {
  background-color: rgb(66, 82, 204);
  width: 466px;
  height: 60px;
  font-size: 20px;
  color: white;
  margin-bottom: 31px;
  font-family: "Mallanna", sans-serif;
  font-weight: 400;
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
}
</style>
