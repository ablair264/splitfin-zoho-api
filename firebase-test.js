// debug-firebase-json.js
// This script helps debug Firebase JSON parsing issues

import dotenv from 'dotenv';
dotenv.config();

console.log('=== Firebase JSON Debug ===\n');

const jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!jsonString) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON is not set!');
    process.exit(1);
}

console.log('1. Raw string length:', jsonString.length);
console.log('2. First 50 characters:', jsonString.substring(0, 50));
console.log('3. First character code:', jsonString.charCodeAt(0));
console.log('4. Starts with quote?:', jsonString[0] === '"');
console.log('5. Starts with brace?:', jsonString[0] === '{');

// Check for common issues
if (jsonString[0] === '"' || jsonString[0] === "'") {
    console.error('\n❌ ERROR: JSON is wrapped in quotes!');
    console.log('The environment variable should NOT have surrounding quotes.');
    console.log('Remove the quotes from the beginning and end.');
}

// Try to parse different variations
console.log('\n=== Parsing attempts ===');

// Attempt 1: Parse as-is
try {
    const parsed = JSON.parse(jsonString);
    console.log('✅ Parsed successfully as-is');
    console.log('Project ID:', parsed.project_id);
} catch (e) {
    console.error('❌ Parse as-is failed:', e.message);
}

// Attempt 2: Remove surrounding quotes if present
if (jsonString[0] === '"' && jsonString[jsonString.length - 1] === '"') {
    try {
        const unquoted = jsonString.slice(1, -1);
        const parsed = JSON.parse(unquoted);
        console.log('✅ Parsed successfully after removing quotes');
        console.log('Project ID:', parsed.project_id);
    } catch (e) {
        console.error('❌ Parse after removing quotes failed:', e.message);
    }
}

// Attempt 3: Unescape if needed
try {
    const unescaped = jsonString.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    const parsed = JSON.parse(unescaped);
    console.log('✅ Parsed successfully after unescaping');
    console.log('Project ID:', parsed.project_id);
} catch (e) {
    console.error('❌ Parse after unescaping failed:', e.message);
}

// Show what the JSON should look like
console.log('\n=== How to fix ===');
console.log('In Render, set FIREBASE_SERVICE_ACCOUNT_JSON to the JSON content WITHOUT any surrounding quotes.');
console.log('It should start with { and end with }');
console.log('\nExample of correct format:');
console.log('{');
console.log('  "type": "service_account",');
console.log('  "project_id": "your-project-id",');
console.log('  ...');
console.log('}');