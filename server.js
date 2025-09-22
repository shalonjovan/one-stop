const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors());

// --- Gemini API Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Serve static frontend files
app.use(express.static(path.join(__dirname, '/')));

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const username = req.body.username;
        const fileExt = path.extname(file.originalname);
        cb(null, `${username}${fileExt}`);
    }
});
const upload = multer({ storage: storage });

// Define file paths
const usersFilePath = 'users.json';
const assessmentFilePath = 'assessment_results.json';

// Utility functions (read/write JSON)
const readJsonFile = (filePath, defaultValue = []) => {
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error(`Error parsing JSON file at ${filePath}:`, err);
            return defaultValue;
        }
    }
    return defaultValue;
};
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error writing JSON file at ${filePath}:`, err);
    }
};


// --- API Endpoints ---

// Secure Gemini API Proxy Endpoint
app.post('/gemini-proxy', async (req, res) => {
    const { prompt } = req.body;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key not configured on the server.' });
    }
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        
        // --- NEW: Check for blocked responses due to safety settings ---
        const candidate = response.data.candidates[0];
        if (!candidate.content || candidate.finishReason === 'SAFETY') {
            console.error('Gemini response blocked due to safety settings.');
            return res.status(400).json({ error: 'The AI response was blocked for safety reasons. This can happen with certain topics. Please try a different stream or modify the prompts.' });
        }
        
        const text = candidate.content.parts[0].text;
        res.json({ text });
        
    } catch (error) {
        console.error('Error calling Gemini API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to communicate with the AI service.' });
    }
});


// User management and assessment saving endpoints...
app.post('/signup', (req, res) => {
    const user = req.body;
    if (!user.username || !user.password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    let users = readJsonFile(usersFilePath);
    if (users.some(u => u.username === user.username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    users.push(user);
    writeJsonFile(usersFilePath, users);
    res.json({ status: 'success' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    let users = readJsonFile(usersFilePath);
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ status: 'success', user: { username: user.username } });
    } else {
        res.status(401).json({ error: 'Invalid username or password.' });
    }
});

app.post('/save-assessment', (req, res) => {
    const assessmentData = req.body;
    const assessmentResults = readJsonFile(assessmentFilePath);
    
    // Check if assessment for this user already exists, update if it does
    const existingIndex = assessmentResults.findIndex(result => result.userName === assessmentData.userName);
    if (existingIndex !== -1) {
        assessmentResults[existingIndex] = assessmentData;
    } else {
        assessmentResults.push(assessmentData);
    }
    
    writeJsonFile(assessmentFilePath, assessmentResults);
    res.json({ status: 'success' });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});