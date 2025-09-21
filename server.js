const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '/')));

// Normal signup
app.post('/signup', (req, res) => {
    const user = req.body;
    if (!user.username || !user.password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    let users = [];
    if (fs.existsSync('users.json')) {
        users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    }

    if (users.some(u => u.username === user.username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    users.push(user);
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    res.json({ status: 'success' });
});

// Google signup
app.post('/google-signup', (req, res) => {
    const user = req.body;
    if (!user.email || !user.name) return res.status(400).json({ error: 'Google user info missing' });

    let users = [];
    if (fs.existsSync('users.json')) {
        users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    }

    if (users.some(u => u.email === user.email)) {
        return res.status(400).json({ error: 'User already exists' });
    }

    users.push(user);
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    res.json({ status: 'success' });
});

// Redirect root to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
