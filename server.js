const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const bcrypt = require('bcrypt');
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

// Define file paths
const usersFilePath = 'users.json';
const assessmentFilePath = 'assessment_results.json';
const collegesFilePath = 'srm.json';

// Utility functions (read/write JSON)
const readJsonFile = (filePath, defaultValue = []) => {
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            if (data.trim() === '') return defaultValue;
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

// --- ADDED: Ensure the 'uploads' directory exists ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// --- ADDED: Multer setup for storing profile pictures ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // The directory where files will be stored
    },
    filename: function (req, file, cb) {
        // Use the username from the request body to create a unique filename
        // This will overwrite the previous picture if a new one is uploaded for the same user
        const username = req.body.username;
        const fileExtension = path.extname(file.originalname);
        cb(null, username + fileExtension);
    }
});

const upload = multer({ storage: storage });

// --- API Endpoints ---

// --- ADDED: Endpoint to handle profile picture upload ---
app.post('/upload-profile-picture', upload.single('profilePicture'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
    }
    // The file is now saved. Send a success response.
    res.status(200).json({ message: 'Profile picture uploaded successfully!', filePath: req.file.path });
});

// --- ADDED: Endpoint to retrieve and serve a user's profile picture ---
app.get('/profile-picture/:username', (req, res) => {
    const { username } = req.params;
    const extensions = ['.png', '.jpg', '.jpeg', '.gif']; // Common image extensions
    let userImagePath = null;

    // Check for the user's image file with different possible extensions
    for (const ext of extensions) {
        const potentialPath = path.join(__dirname, 'uploads', username + ext);
        if (fs.existsSync(potentialPath)) {
            userImagePath = potentialPath;
            break;
        }
    }

    if (userImagePath) {
        res.sendFile(userImagePath);
    } else {
        res.status(404).json({ message: 'Profile picture not found.' });
    }
});

app.get('/get-colleges', (req, res) => {
    const colleges = readJsonFile(collegesFilePath);
    res.json(colleges);
});

app.get('/get-assessment/:username', (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Username is required.' });

    const allResults = readJsonFile(assessmentFilePath);
    const userResult = allResults.find(result => result.username === username);

    if (userResult) {
        res.json({ result: userResult });
    } else {
        res.status(404).json({ error: 'Assessment results not found for this user.' });
    }
});

app.get('/check-assessment/:username', (req, res) => {
    const { username } = req.params;
    const allResults = readJsonFile(assessmentFilePath);
    const hasTaken = allResults.some(result => result.username === username);
    res.json({ hasTakenAssessment: hasTaken });
});

app.post('/gemini-proxy', async (req, res) => {
    const { prompt } = req.body;
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API key not configured.' });
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
    try {
        const response = await axios.post(GEMINI_API_URL, { contents: [{ parts: [{ text: prompt }] }] });
        const candidate = response.data.candidates[0];
        if (!candidate.content || candidate.finishReason === 'SAFETY') {
            return res.status(400).json({ error: 'AI response blocked for safety reasons.' });
        }
        res.json({ text: candidate.content.parts[0].text });
    } catch (error) {
        console.error('Error calling Gemini API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to communicate with AI service.' });
    }
});

app.post('/signup', async (req, res) => {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
        return res.status(400).json({ error: 'Full name, username and password are required' });
    }
    let users = readJsonFile(usersFilePath);
    if (users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ name, username, password: hashedPassword });
    writeJsonFile(usersFilePath, users);
    res.json({ status: 'success' });
});

app.post('/google-signup', (req, res) => {
    const { name, email } = req.body;
    let users = readJsonFile(usersFilePath);
    if (users.some(u => u.email === email)) {
        const existingUser = users.find(u => u.email === email);
        return res.json({ status: 'success', isLogin: true, user: { name: existingUser.name, username: existingUser.username } });
    }
    const username = email;
    const newUser = { name, email, username, isGoogle: true };
    users.push(newUser);
    writeJsonFile(usersFilePath, users);
    res.json({ status: 'success', isLogin: false, user: { name: newUser.name, username: newUser.username } });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let users = readJsonFile(usersFilePath);
    const user = users.find(u => u.username === username);
    
    if (user && !user.isGoogle) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.json({ status: 'success', user: { name: user.name, username: user.username } });
        } else {
            res.status(401).json({ error: 'Invalid username or password.' });
        }
    } else {
        res.status(401).json({ error: 'Invalid username or password.' });
    }
});

app.post('/google-login', (req, res) => {
    const { email } = req.body;
    let users = readJsonFile(usersFilePath);
    const user = users.find(u => u.email === email);
    if (user && user.isGoogle) {
        res.json({ status: 'success', user: { name: user.name, username: user.username } });
    } else {
        res.status(401).json({ error: 'No account found for this Google email. Please sign up first.' });
    }
});

app.post('/save-assessment', (req, res) => {
    const assessmentData = req.body;
    const assessmentResults = readJsonFile(assessmentFilePath, []);
    const existingIndex = assessmentResults.findIndex(result => result.username === assessmentData.username);
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