import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { google } from "googleapis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate environment variables
const envSchema = z.object({
  CLIENT_ID: z.string(),
  CLIENT_SECRET: z.string(),
  REFRESH_TOKEN: z.string(),
  REDIRECT_URI: z.string(),
});

// Create a cache for the access token
let cachedToken: {
  accessToken: string;
  expiryDate: number;
} | null = null;

// Gmail API setup
const createGmailClient = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  // Use cached token if available and not expired
  if (cachedToken && cachedToken.expiryDate > Date.now()) {
    oauth2Client.setCredentials({
      access_token: cachedToken.accessToken,
      refresh_token: process.env.REFRESH_TOKEN,
    });
  } else {
    // Otherwise, get a new token
    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    const tokenResponse = await oauth2Client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (accessToken && tokenResponse.res?.data.expiry_date) {
      cachedToken = {
        accessToken,
        expiryDate: tokenResponse.res.data.expiry_date,
      };
    }
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
};

// Create MCP server
const server = new McpServer({
  name: "gmail-mcp-server",
  version: "1.0.0", // Replace with actual version if available from package.json
});

// Define MCP tools
server.tool("gmail_refresh_token", {}, async () => {
  try {
    // Validate environment variables
    envSchema.parse(process.env);

    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    const tokenResponse = await oauth2Client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (accessToken && tokenResponse.res?.data.expiry_date) {
      cachedToken = {
        accessToken,
        expiryDate: tokenResponse.res.data.expiry_date,
      };

      return {
        content: [
          {
            type: "text",
            text: `Access token refreshed successfully. Expires at: ${new Date(
              tokenResponse.res.data.expiry_date
            ).toISOString()}`,
          },
        ],
      };
    } else {
      throw new Error("Failed to get access token");
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error refreshing token: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
});

server.tool(
  "gmail_get_recent_emails",
  {
    maxResults: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of emails to return"),
    labelIds: z
      .array(z.string())
      .optional()
      .default(["INBOX"])
      .describe("Labels to filter emails by"),
  },
  async (params: { maxResults: number; labelIds: string[] }) => {
    try {
      // Validate environment variables
      envSchema.parse(process.env);

      const gmail = await createGmailClient();

      // Get messages list
      const messageList = await gmail.users.messages.list({
        userId: "me",
        maxResults: params.maxResults,
        labelIds: params.labelIds,
      });

      if (
        !messageList.data.messages ||
        messageList.data.messages.length === 0
      ) {
        return {
          content: [{ type: "text", text: "No recent emails found." }],
        };
      }

      // Get full message details for each message
      const messages = await Promise.all(
        messageList.data.messages.map(async (message) => {
          if (!message.id) return null;

          const fullMessage = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
          });

          if (!fullMessage.data) return null;

          // Extract headers
          const headers =
            fullMessage.data.payload?.headers?.reduce((acc, header) => {
              if (header.name && header.value) {
                acc[header.name.toLowerCase()] = header.value;
              }
              return acc;
            }, {} as Record<string, string>) || {};

          // Extract body content
          let bodyContent = "";

          const getBodyContent = (part: any): string => {
            if (part.body?.data) {
              return Buffer.from(part.body.data, "base64").toString("utf-8");
            }

            if (part.parts) {
              return part.parts.map(getBodyContent).join("");
            }

            return "";
          };

          if (fullMessage.data.payload) {
            bodyContent = getBodyContent(fullMessage.data.payload);
            // Limit to first 1k chars
            bodyContent = bodyContent.substring(0, 1000);
          }

          return {
            id: fullMessage.data.id,
            threadId: fullMessage.data.threadId,
            labelIds: fullMessage.data.labelIds,
            snippet: fullMessage.data.snippet,
            subject: headers.subject,
            from: headers.from,
            to: headers.to,
            date: headers.date,
            bodyPreview: bodyContent,
            size: fullMessage.data.sizeEstimate,
          };
        })
      );

      // Filter out null values
      const validMessages = messages.filter((message) => message !== null);

      return {
        content: [
          {
            type: "text",
            text: `Found ${validMessages.length} emails:\n${JSON.stringify(
              validMessages,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching emails: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "gmail_get_email_body_chunk",
  {
    messageId: z.string().describe("ID of the email to retrieve"),
    offset: z
      .number()
      .default(0)
      .describe("Starting offset (character position) in the email body"),
  },
  async (params: { messageId: string; offset: number }) => {
    try {
      // Validate environment variables
      envSchema.parse(process.env);

      const gmail = await createGmailClient();

      // Get the full message
      const message = await gmail.users.messages.get({
        userId: "me",
        id: params.messageId,
        format: "full",
      });

      if (!message.data || !message.data.payload) {
        throw new Error("Message not found or has no content");
      }

      // Extract body content
      const getBodyContent = (part: any): string => {
        if (part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf-8");
        }

        if (part.parts) {
          return part.parts.map(getBodyContent).join("");
        }

        return "";
      };

      let bodyContent = getBodyContent(message.data.payload);
      const totalLength = bodyContent.length;
      const chunk = bodyContent.substring(params.offset, params.offset + 1000);
      const hasMore = params.offset + 1000 < totalLength;
      const nextOffset = hasMore ? params.offset + 1000 : null;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              messageId: params.messageId,
              offset: params.offset,
              chunk,
              chunkLength: chunk.length,
              hasMore,
              nextOffset,
              totalLength,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching email body: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "gmail_send_email",
  {
    to: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content (plain text)"),
  },
  async (params: { to: string; subject: string; body: string }) => {
    try {
      // Validate environment variables
      envSchema.parse(process.env);

      const gmail = await createGmailClient();

      // Construct the email
      let email = [`To: ${params.to}`, `Subject: ${params.subject}`];

      email.push("Content-Type: text/plain; charset=utf-8", "", params.body);

      // Encode the email in base64url format
      const rawEmail = Buffer.from(email.join("\r\n")).toString("base64url");

      // Send the email
      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: rawEmail,
        },
      });

      return {
        content: [
          {
            type: "text",
            text: `Email sent successfully. Message ID: ${result.data.id}, Thread ID: ${result.data.threadId}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error sending email: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  try {
    envSchema.parse(process.env);
    console.log("Environment variables validated successfully.");
    const transport = new StdioServerTransport();
    console.log("Connecting server...");
    await server.connect(transport);
    console.log("MCP Server connected via stdio");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main();
