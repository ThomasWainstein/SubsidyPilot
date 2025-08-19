# Claude MCP Connector Setup Guide

## Overview
I've created a custom MCP (Model Context Protocol) server that allows Claude to directly interact with your Supabase project to review edge functions, analyze performance, and access logs.

## MCP Server URL
Once deployed, your MCP server will be available at:
```
https://gvfgvbztagafjykncwto.supabase.co/functions/v1/claude-mcp-server
```

## Setup Instructions

### 1. Deploy the MCP Server
The `claude-mcp-server` edge function will be automatically deployed with your next push to the repository.

### 2. Configure Claude Connector
In Claude, add a new custom connector with these settings:

- **Name**: `Supabase Edge Functions Reviewer`
- **Remote MCP server URL**: `https://gvfgvbztagafjykncwto.supabase.co/functions/v1/claude-mcp-server`
- **OAuth Client ID**: *(leave empty)*
- **OAuth Client Secret**: *(leave empty)*

### 3. Available Tools
Once connected, Claude will have access to these tools:

#### 📋 `list_edge_functions`
Lists all available edge functions in your Supabase project
```
Usage: Simply ask Claude "What edge functions do you have?"
```

#### 📝 `get_function_code`
Retrieves the source code of any specific edge function
```
Usage: "Show me the code for the les-aides-full-sync function"
```

#### 📊 `get_function_logs`
Gets recent logs for any edge function (last 50 entries by default)
```
Usage: "Get the logs for the data-purge function"
```

#### ⚡ `analyze_function_performance`
Analyzes performance patterns, error rates, and provides recommendations
```
Usage: "Analyze the performance of all functions in the last 24 hours"
```

#### 🗄️ `get_database_schema`
Provides information about your database tables and schemas
```
Usage: "What tables are in the database?" or "Show me the schema for the subsidies table"
```

## Example Conversations with Claude

Once connected, you can ask Claude things like:

- *"Review all my edge functions and tell me which ones might have issues"*
- *"Check the logs for the les-aides-full-sync function and explain any errors"*
- *"Analyze the performance of my data-purge function"*
- *"Show me the code for sync-les-aides-fixed and suggest improvements"*
- *"What's the structure of my database tables?"*

## Security Notes

- The MCP server is configured as **public** (no JWT verification required)
- It only provides **read access** to function code, logs, and schema information
- No write operations or sensitive data modifications are possible
- The server runs in your own Supabase environment

## Troubleshooting

### Connection Issues
1. Verify the MCP server URL is correct
2. Check that the edge function is deployed successfully
3. Try accessing the URL directly in a browser (should return JSON)

### No Response from Tools
1. Check the edge function logs in Supabase dashboard
2. Ensure your Supabase environment variables are set correctly
3. Verify the function has the proper permissions

## Advanced Usage

The MCP server can be extended to add more tools:
- Database query execution (with proper security)
- Function deployment status
- Real-time monitoring dashboards
- Integration with external services

## Support

If you encounter issues:
1. Check the `claude-mcp-server` function logs in your Supabase dashboard
2. Verify the function deployment was successful
3. Test the MCP endpoint directly with a tool like Postman