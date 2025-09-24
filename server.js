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

// server.js

// ... (your existing code) ...

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

// --- ADD THIS LINE TO FIX THE ERROR ---
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

// ... (rest of your code) ...

// --- Gemini API Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Serve static frontend files
app.use(express.static(path.join(__dirname, '/')));

// Define file paths
const usersFilePath = 'users.json';
const assessmentFilePath = 'assessment_results.json';
const collegesFilePath = 'colleges.json';
const coursesFilePath = 'courses.json';

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
    // Extract filename from link like "./college-dashboard.html?data=./colleges/college-name"
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

// --- API Endpoints ---

<<<<<<< HEAD
=======
// --- ADDED: Endpoint to handle profile picture upload ---
// server.js

app.post('/upload-profile-picture', upload.single('profilePicture'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
    }

    // --- THIS IS THE CRUCIAL ADDITION ---
    // Now, we save the file path to the user's data.

    const { username } = req.body; // Get username from the form data
    const filePath = `/uploads/${req.file.filename}`; // The public URL path to the file

    if (!username) {
        return res.status(400).json({ message: 'Username is required to save the picture.' });
    }

    try {
        const users = readJsonFile(usersFilePath);
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex !== -1) {
            // Add or update the profilePicture property for the user
            users[userIndex].profilePicture = filePath;
            writeJsonFile(usersFilePath, users);

            console.log(`Updated profile picture for ${username}. Path: ${filePath}`);

            // The file is saved and the user record is updated. Send a success response.
            res.status(200).json({
                message: 'Profile picture uploaded successfully!',
                filePath: filePath
            });

        } else {
            // Handle case where user is not found
            res.status(404).json({ message: 'User not found.' });
        }

    } catch (error) {
        console.error('Error updating user data with profile picture:', error);
        res.status(500).json({ message: 'Server error while updating user data.' });
    }
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

>>>>>>> c9f6c4026839b86412ad24ccf74ac1e233f8e85b
app.get('/get-colleges', (req, res) => {
    const colleges = readJsonFile(collegesFilePath);
    res.json(colleges);
});

// Fixed endpoint to match frontend call
app.get('/get-assessment-results', (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required.' });

    const allResults = readJsonFile(assessmentFilePath);
    // Look for both username and userName for backwards compatibility
    const userResult = allResults.find(result => 
        result.username === username || result.userName === username
    );

    if (userResult) {
        res.json(userResult); // Return the result directly, not wrapped in {result: ...}
    } else {
        res.status(404).json({ error: 'Assessment results not found for this user.' });
    }
});

// Keep the old endpoint for backwards compatibility
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

// New endpoint to get college recommendations based on assessment
app.get('/get-recommendations/:username', (req, res) => {
    const { username } = req.params;
    
    try {
        // Get user's assessment results
        const allResults = readJsonFile(assessmentFilePath);
        const userResult = allResults.find(result => 
            result.username === username || result.userName === username
        );
        
        if (!userResult) {
            return res.status(404).json({ error: 'Assessment results not found.' });
        }
        
        // Get colleges data
        const collegesData = readJsonFile(collegesFilePath, []);
        
        // Match specialized fields to college types
        const specializedFields = userResult.specializedFields || [];
        const matchedTypes = matchFieldsToCollegeTypes(specializedFields);
        
        // Find colleges matching the types
        let recommendedColleges = collegesData.filter(college => {
            return matchedTypes.some(type => college.type.includes(type));
        });
        
        // If no specific matches, include general universities and engineering colleges
        if (recommendedColleges.length === 0) {
            recommendedColleges = collegesData.filter(college => 
                college.type.includes('University') || 
                college.type.includes('Engineering') ||
                college.type.includes('Science')
            );
        }
        
        // Load detailed data for each recommended college
        const detailedColleges = [];
        recommendedColleges.forEach(college => {
            const fileName = getCollegeFileName(college.link);
            if (fileName) {
                const detailedDataPath = `./colleges/${fileName}.json`;
                const detailedData = readJsonFile(detailedDataPath, null);
                
                if (detailedData && detailedData.length > 0) {
                    // Merge basic info with detailed info
                    const mergedData = {
                        ...detailedData[0], // Detailed data from individual file
                        basicInfo: college,  // Basic info from colleges.json
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
            recommendedColleges: detailedColleges.slice(0, 10), // Limit to top 10
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
    // Look for existing assessment using both username and userName
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});