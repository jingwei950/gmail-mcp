declare module "@modelcontextprotocol/sdk" {
  import { z } from "zod";

  export class McpServer {
    constructor(name: string);
    defineTool(options: {
      name: string;
      description: string;
      parameters: z.ZodObject<any>;
      execute: (params: any) => Promise<any>;
    }): void;
    listen(transport: McpTransport): void;
  }

  export class McpStdioTransport implements McpTransport {
    constructor();
  }

  export interface McpTransport {
    // Transport interface
  }
}
