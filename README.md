# Gmail MCP Server

A Model Context Protocol (MCP) server for Gmail that enables AI assistants to interact with Gmail through standardized tools.

## Features

- **gmail_refresh_token**: Refresh the access token using the refresh token and client credentials
- **gmail_get_recent_emails**: Get the most recent emails from Gmail (returns metadata, snippets, and first 1k chars of body)
- **gmail_get_email_body_chunk**: Get a 1k character chunk of an email body starting from the specified offset
- **gmail_send_email**: Send an email via Gmail

## Prerequisites

- Node.js (v18 or higher)
- Gmail API credentials
- A refresh token for Gmail API access

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret
   REFRESH_TOKEN=your_refresh_token
   REDIRECT_URI=your_redirect_uri
   ```

### Obtaining Gmail API Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add authorized redirect URIs (e.g., http://localhost:3000/oauth2callback)
   - Save the credentials
   - Download the JSON file with your credentials

### Getting a Refresh Token

To get a refresh token, you'll need to use the provided script:

1.  Make sure you have installed the necessary dependencies by running `npm install`. You might need `npm install open googleapis@105 dotenv` if they weren't installed previously.
2.  Ensure your `.env` file is set up with your `CLIENT_ID`, `CLIENT_SECRET`, and `REDIRECT_URI`.
3.  Run the script:
    ```bash
    node --loader ts-node/esm src/get_refresh_token.ts
    ```
4.  The script will output an authorization URL. Open this URL in your browser.
5.  Authorize the application with your Google account.
6.  After authorization, Google will redirect you to your `REDIRECT_URI`. The script running in your terminal will capture the authorization code from the redirect and exchange it for tokens.
7.  The script will print the refresh token to the console.
8.  Copy this refresh token and add it to your `.env` file:
    ```
    REFRESH_TOKEN=your_new_refresh_token
    ```

## Building and Running

1. Build the project:

   ```bash
   npm run build
   ```

2. Run the server:
   ```bash
   npm start
   ```

## Using with Cursor IDE

This MCP server can be used with Cursor IDE to provide Gmail functionality through the Model Context Protocol.

To use the server with Cursor IDE:

1. Start the server in a terminal window:

   ```bash
   npm start
   ```

2. The server will run and listen for incoming tool requests from Cursor

3. In Cursor IDE, you can now interact with Gmail through the tools exposed by this MCP server

## Example Queries for Cursor

Once set up, you can ask Cursor things like:

- "Show me my most recent emails"
- "Get emails from my inbox with the label 'Important'"
- "Send an email to example@example.com with the subject 'Hello' and body 'How are you?'"
- "Read the full content of the email with ID [email_id]"

## Troubleshooting

If the Gmail tools aren't working properly:

1. Check that your server is running in a terminal window
2. Verify that your `.env` file contains the correct credentials
3. Make sure your refresh token hasn't expired
4. Check the console output of the server for any error messages

## License

ISC
