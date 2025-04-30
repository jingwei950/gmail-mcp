import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Calculate the path to .env relative to the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

dotenv.config({ path: envPath });

console.log("Loaded CLIENT_ID:", process.env.CLIENT_ID);
console.log(
  "Loaded CLIENT_SECRET:",
  process.env.CLIENT_SECRET ? "[Exists]" : "undefined"
);
console.log("Loaded REDIRECT_URI:", process.env.REDIRECT_URI);

import { google } from "googleapis";
import http from "http";
import url from "url";
import open from "open";

// console.log("Loaded REDIRECT_URI:", process.env.REDIRECT_URI); // Removed this line

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Generate the URL to redirect to Google's OAuth 2.0 server
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // This will get us a refresh token
  scope: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
  ],
  prompt: "consent", // Force to prompt the user for consent to get refresh token every time
});

console.log("Authorize this app by visiting this URL:", authUrl);
open(authUrl); // Open the URL in the browser

// Create a server to handle the OAuth callback
const server = http.createServer(async (req, res) => {
  try {
    // Get the code from the callback URL
    const queryObject = url.parse(req.url as string, true).query;
    const code = queryObject.code as string;

    if (code) {
      // Exchange the code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      console.log("\nRefresh Token:", tokens.refresh_token);
      console.log("\nAccess Token:", tokens.access_token);

      // Save the refresh token to your .env file
      console.log("\nAdd this to your .env file:");
      console.log(`REFRESH_TOKEN=${tokens.refresh_token}`);

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<h1>Authentication successful!</h1><p>You can close this window and go back to the terminal.</p>"
      );
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Authentication failed!</h1><p>No code was received.</p>");
    }

    // Close the server after handling the request
    server.close();
  } catch (error) {
    console.error("Error:", error);
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end("<h1>Server Error!</h1>");
    server.close();
  }
});

// Listen on the redirect URI's port
const redirectUri = process.env.REDIRECT_URI as string;
const port = parseInt(new URL(redirectUri).port) || 80;
server.listen(port, () => {
  console.log(`Listening for OAuth callback on port ${port}`);
});
