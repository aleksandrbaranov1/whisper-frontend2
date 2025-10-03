# Используем Node.js образ для сборки и запуска
FROM node:20-bullseye-slim

# Рабочая директория внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --quiet --legacy-peer-deps

# Копируем весь проект
COPY . .

# Собираем фронтенд
RUN npm run build

# Устанавливаем serve для отдачи сборки
RUN npm install -g serve

# Запускаем фронтенд на порту 3000
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
