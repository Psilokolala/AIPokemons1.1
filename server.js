const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Настраиваем статические файлы
app.use(express.static(path.join(__dirname)));

// Отправляем index.html при запросе корневого пути
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запускаем сервер
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
}); 