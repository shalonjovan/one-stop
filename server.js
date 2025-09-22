const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors());

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

// Utility function to read JSON files
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

// Utility function to write JSON files
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error writing JSON file at ${filePath}:`, err);
    }
};

// --- API Endpoints ---

// Normal signup
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

// Google signup
app.post('/google-signup', (req, res) => {
    const user = req.body;
    if (!user.email || !user.name) return res.status(400).json({ error: 'Google user info missing' });

    let users = readJsonFile(usersFilePath);

    if (users.some(u => u.email === user.email)) {
        return res.status(400).json({ error: 'User already exists' });
    }

    users.push(user);
    writeJsonFile(usersFilePath, users);
    res.json({ status: 'success', user: { username: user.username, email: user.email } });
});

// Normal login
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

// Google login
app.post('/google-login', (req, res) => {
    const { email } = req.body;

    let users = readJsonFile(usersFilePath);

    const user = users.find(u => u.email === email);

    if (user) {
        res.json({ status: 'success', user: { username: user.username, email: user.email } });
    } else {
        res.status(401).json({ error: 'User not found. Please sign up first.' });
    }
});

// Endpoint to check if a user has taken the assessment
app.get('/check-assessment/:username', (req, res) => {
    const username = req.params.username;
    const assessmentResults = readJsonFile(assessmentFilePath);
    const hasTakenAssessment = assessmentResults.some(result => result.userName === username);
    res.json({ hasTakenAssessment });
});

// Endpoint to save assessment data
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

// Endpoint to get assessment data for a specific user
app.get('/get-assessment/:username', (req, res) => {
    const username = req.params.username;
    const assessmentResults = readJsonFile(assessmentFilePath);
    const userAssessment = assessmentResults.find(result => result.userName === username);
    if (userAssessment) {
        res.json({ status: 'success', result: userAssessment });
    } else {
        res.status(404).json({ error: 'Assessment not found for this user.' });
    }
});

// Endpoint to handle profile picture upload
app.post('/upload-picture', upload.single('profilePicture'), (req, res) => {
    if (req.file) {
        res.json({ status: 'success', message: 'Picture uploaded successfully.' });
    } else {
        res.status(400).json({ error: 'No file uploaded.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
