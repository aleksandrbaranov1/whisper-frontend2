<script setup></script>

<template>
  <div class="placeholder-container">
    <div class="placeholder-content">
      <div class="text-container">
        <p>Выберите, кому бы вы хотели написать</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.placeholder-container {
  width: 973px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: white;
  align-items: center;
  justify-content: center;
}
.text-container {
  background-color: rgb(66, 82, 204);
  border-radius: 20px;
  padding-left: 10px;
  padding-right: 10px;
}

p {
  font-size: 20px;
  font-family: "Mallanna", sans-serif;
  color: white;
  font-weight: 400;
}
</style>
