import axios from 'axios';
import readline from 'readline';

// Zoho API Configuration
const ZOHO_REGION = process.env.ZOHO_REGION || 'eu';
const ZOHO_CLIENT_ID = "1000.543fc7c77d29dee8085acf33bc15ae4b.a3174c09d0e2e5562a00bc81830558b0";
const ZOHO_CLIENT_SECRET = "536429f4d720d2d33f028dcecad63a20881a7939a0";

// Set URLs based on region
let ZOHO_ACCOUNTS_BASE;
if (ZOHO_REGION === 'eu') {
  ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.eu';
} else if (ZOHO_REGION === 'in') {
  ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.in';
} else if (ZOHO_REGION === 'com.au') {
  ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.com.au';
} else {
  ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.com';
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getNewRefreshToken() {
  console.log("🔄 Zoho Refresh Token Generator");
  console.log("=".repeat(50));
  console.log(`📍 Using Zoho ${ZOHO_REGION} region`);
  console.log(`🔗 Accounts Base: ${ZOHO_ACCOUNTS_BASE}`);
  console.log(`🆔 Client ID: ${ZOHO_CLIENT_ID}`);
  console.log("-".repeat(50));

  // Step 1: Generate authorization URL
  const authUrl = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/auth?response_type=code&client_id=${ZOHO_CLIENT_ID}&scope=ZohoInventory.invoices.READ,ZohoInventory.salesorders.READ,ZohoInventory.items.READ&redirect_uri=https://localhost/callback&access_type=offline`;

  console.log("\n📋 Step 1: Visit this URL in your browser:");
  console.log(authUrl);
  console.log("\n🔍 After authorization, you'll be redirected to a URL like:");
  console.log("https://localhost/callback?code=YOUR_AUTHORIZATION_CODE&location=YOUR_LOCATION");

  // Step 2: Get authorization code from user
  const authCode = await question("\n📝 Enter the authorization code from the redirect URL: ");
  
  if (!authCode || authCode.trim() === '') {
    console.log("❌ No authorization code provided. Exiting.");
    rl.close();
    return;
  }

  console.log("\n🔄 Step 2: Exchanging authorization code for tokens...");

  try {
    // Step 3: Exchange authorization code for tokens
    const tokenUrl = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`;
    
    // Create form-encoded data string
    const formData = new URLSearchParams({
      code: authCode.trim(),
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      redirect_uri: 'https://localhost/callback',
      grant_type: 'authorization_code'
    }).toString();

    console.log("🔍 Sending request to:", tokenUrl);
    console.log("📝 Form data:", formData);

    const response = await axios.post(tokenUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log("📊 Response status:", response.status);
    console.log("📊 Response data:", JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      const tokens = response.data;
      
      console.log("\n✅ Success! Here are your new tokens:");
      console.log("=".repeat(50));
      console.log(`🔑 Access Token: ${tokens.access_token}`);
      console.log(`🔄 Refresh Token: ${tokens.refresh_token}`);
      console.log(`