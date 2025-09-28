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

app.use(bodyParser.json());
app.use(cors());

// IMPORTANT: Fix static file serving for Vercel
app.use(express.static(path.join(__dirname, '../')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/colleges', express.static(path.join(__dirname, '../colleges')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const username = req.body.username;
        const fileExtension = path.extname(file.originalname);
        cb(null, username + fileExtension);
    }
});

const upload = multer({ storage: storage });

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Define file paths
const usersFilePath = path.join(__dirname, '../users.json');
const assessmentFilePath = path.join(__dirname, '../assessment_results.json');
const collegesFilePath = path.join(__dirname, '../colleges.json');
const coursesFilePath = path.join(__dirname, '../courses.json');

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

// Helper function to extract college filename from link
const getCollegeFileName = (link) => {
    const match = link.match(/\.\/colleges\/(.+)$/);
    return match ? match[1] : null;
};

// Helper function to match specialized fields to college types
const matchFieldsToCollegeTypes = (specializedFields) => {
    const typeMap = {
        'Engineering': ['computer', 'software', 'ai', 'artificial intelligence', 'machine learning', 'data science', 'robotics', 'cybersecurity', 'engineering', 'technology'],
        'Medical': ['medicine', 'medical', 'health', 'biology', 'biotechnology', 'biomedical'],
        'Management': ['management', 'business', 'mba'],
        'University': ['science', 'physics', 'chemistry', 'mathematics', 'research'],
        'Agricultural University': ['agriculture', 'environmental'],
        'Arts & Science': ['arts', 'literature', 'humanities'],
        'Science': ['science', 'physics', 'chemistry', 'mathematics'],
        'Commerce': ['commerce', 'economics', 'finance']
    };
    
    const matchedTypes = new Set();
    
    specializedFields.forEach(field => {
        const fieldLower = field.toLowerCase();
        
        Object.keys(typeMap).forEach(type => {
            typeMap[type].forEach(keyword => {
                if (fieldLower.includes(keyword)) {
                    matchedTypes.add(type);
                }
            });
        });
    });
    
    return Array.from(matchedTypes);
};

// --- ALL YOUR EXISTING API ENDPOINTS (keep everything as is) ---

app.post('/upload-profile-picture', upload.single('profilePicture'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
    }

    const { username } = req.body;
    const filePath = `/uploads/${req.file.filename}`;

    if (!username) {
        return res.status(400).json({ message: 'Username is required to save the picture.' });
    }

    try {
        const users = readJsonFile(usersFilePath);
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex !== -1) {
            users[userIndex].profilePicture = filePath;
            writeJsonFile(usersFilePath, users);

            console.log(`Updated profile picture for ${username}. Path: ${filePath}`);

            res.status(200).json({
                message: 'Profile picture uploaded successfully!',
                filePath: filePath
            });

        } else {
            res.status(404).json({ message: 'User not found.' });
        }

    } catch (error) {
        console.error('Error updating user data with profile picture:', error);
        res.status(500).json({ message: 'Server error while updating user data.' });
    }
});

app.get('/profile-picture/:username', (req, res) => {
    const { username } = req.params;
    const extensions = ['.png', '.jpg', '.jpeg', '.gif'];
    let userImagePath = null;

    for (const ext of extensions) {
        const potentialPath = path.join(__dirname, '../uploads', username + ext);
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

app.get('/get-assessment-results', (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required.' });

    const allResults = readJsonFile(assessmentFilePath);
    const userResult = allResults.find(result => 
        result.username === username || result.userName === username
    );

    if (userResult) {
        res.json(userResult);
    } else {
        res.status(404).json({ error: 'Assessment results not found for this user.' });
    }
});

app.get('/get-assessment/:username', (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Username is required.' });

    const allResults = readJsonFile(assessmentFilePath);
    const userResult = allResults.find(result => 
        result.username === username || result.userName === username
    );

    if (userResult) {
        res.json({ result: userResult });
    } else {
        res.status(404).json({ error: 'Assessment results not found for this user.' });
    }
});

app.get('/check-assessment/:username', (req, res) => {
    const { username } = req.params;
    const allResults = readJsonFile(assessmentFilePath);
    const hasTaken = allResults.some(result => 
        result.username === username || result.userName === username
    );
    res.json({ hasTakenAssessment: hasTaken });
});

app.get('/get-recommendations/:username', (req, res) => {
    const { username } = req.params;
    
    try {
        const allResults = readJsonFile(assessmentFilePath);
        const userResult = allResults.find(result => 
            result.username === username || result.userName === username
        );
        
        if (!userResult) {
            return res.status(404).json({ error: 'Assessment results not found.' });
        }
        
        const collegesData = readJsonFile(collegesFilePath, []);
        const specializedFields = userResult.specializedFields || [];
        const matchedTypes = matchFieldsToCollegeTypes(specializedFields);
        
        let recommendedColleges = collegesData.filter(college => {
            return matchedTypes.some(type => college.type.includes(type));
        });
        
        if (recommendedColleges.length === 0) {
            recommendedColleges = collegesData.filter(college => 
                college.type.includes('University') || 
                college.type.includes('Engineering') ||
                college.type.includes('Science')
            );
        }
        
        const detailedColleges = [];
        recommendedColleges.forEach(college => {
            const fileName = getCollegeFileName(college.link);
            if (fileName) {
                const detailedDataPath = path.join(__dirname, '../colleges', `${fileName}.json`);
                const detailedData = readJsonFile(detailedDataPath, null);
                
                if (detailedData && detailedData.length > 0) {
                    const mergedData = {
                        ...detailedData[0],
                        basicInfo: college,
                        nirf: college.nirf,
                        naac: college.naac,
                        placement: college.placement,
                        review: college.review,
                        location: college.location,
                        gov_pri: college.gov_pri,
                        exam: college.exam
                    };
                    detailedColleges.push(mergedData);
                }
            }
        });
        
        res.json({
            userInterests: specializedFields,
            matchedTypes,
            recommendedColleges: detailedColleges.slice(0, 10),
            stream: userResult.stream,
            totalFound: detailedColleges.length
        });
        
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations.' });
    }
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
    const existingIndex = assessmentResults.findIndex(result => 
        result.username === assessmentData.username || 
        result.userName === assessmentData.userName
    );
    
    if (existingIndex !== -1) {
        assessmentResults[existingIndex] = assessmentData;
    } else {
        assessmentResults.push(assessmentData);
    }
    writeJsonFile(assessmentFilePath, assessmentResults);
    res.json({ status: 'success' });
});

// IMPORTANT: Add these route handlers for HTML pages and static files

// Handle specific HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Serve all HTML files
app.get('/*.html', (req, res) => {
    const htmlFile = req.params[0] + '.html';
    const filePath = path.join(__dirname, '../', htmlFile);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Page not found');
    }
});

// Serve JavaScript files
app.get('/*.js', (req, res) => {
    const jsFile = req.params[0] + '.js';
    const filePath = path.join(__dirname, '../', jsFile);
    
    if (fs.existsSync(filePath)) {
        res.type('application/javascript');
        res.sendFile(filePath);
    } else {
        res.status(404).send('Script not found');
    }
});

// Serve CSS files
app.get('/*.css', (req, res) => {
    const cssFile = req.params[0] + '.css';
    const filePath = path.join(__dirname, '../', cssFile);
    
    if (fs.existsSync(filePath)) {
        res.type('text/css');
        res.sendFile(filePath);
    } else {
        res.status(404).send('Style not found');
    }
});

// Serve image files
app.get('/assets/images/*', (req, res) => {
    const imagePath = path.join(__dirname, '../assets/images', req.params[0]);
    
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Image not found');
    }
});

// Export for Vercel
module.exports = app;