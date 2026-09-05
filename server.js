const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serwuj pliki statyczne
app.use(express.static(path.join(__dirname)));

// Serwuj folder data
app.use('/data', express.static(path.join(__dirname, 'data')));

// Główna strona
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start serwera
app.listen(PORT, () => {
    console.log('🔥 Cheetos Finder działa na porcie ' + PORT);
    console.log('🌐 http://localhost:' + PORT);
});