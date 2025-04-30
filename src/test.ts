// This file can be used to test the MCP server
// It doesn't need to be built as part of the main application

console.log("Gmail MCP Server Test");
console.log("---------------------");
console.log("To use this MCP server with Cursor IDE:");
console.log("1. Create a .env file with your Gmail API credentials");
console.log("2. Build the project with: npm run build");
console.log("3. Start the server with: npm start");
console.log("4. Use Cursor IDE to interact with the Gmail tools");
console.log("");
console.log("Available tools:");
console.log("- gmail_refresh_token: Refresh the access token");
console.log("- gmail_get_recent_emails: Get recent emails");
console.log("- gmail_get_email_body_chunk: Get a chunk of an email body");
console.log("- gmail_send_email: Send an email");
