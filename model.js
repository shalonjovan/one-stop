// Quick script to check available Gemini models
// Save this as check-models.js and run with: node check-models.js

require('dotenv').config();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found in .env file');
    process.exit(1);
}

async function checkAvailableModels() {
    try {
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );
        
        console.log('Available models:');
        response.data.models.forEach(model => {
            if (model.name.includes('gemini')) {
                console.log(`- ${model.name}`);
                console.log(`  Display Name: ${model.displayName}`);
                console.log(`  Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
                console.log('');
            }
        });
    } catch (error) {
        console.error('Error fetching models:', error.response?.data || error.message);
    }
}

checkAvailableModels();