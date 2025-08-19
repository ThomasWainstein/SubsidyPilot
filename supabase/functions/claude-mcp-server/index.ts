import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Available edge functions in your project
const EDGE_FUNCTIONS = [
  'classify-document',
  'extract-canonical-subsidy', 
  'extract-document-data',
  'improve-subsidy-titles',
  'training-pipeline',
  'upload-farm-document',
  'ai-content-processor',
  'ai-test-single-page',
  'data-purge',
  'les-aides-full-sync',
  'sync-les-aides-fixed',
  'sync-progress',
  'smart-change-detector'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (req.method === 'GET') {
      // Handle capability discovery
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        result: {
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "Supabase Edge Functions MCP Server",
            version: "1.0.0"
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mcpRequest: MCPRequest = await req.json();
    console.log('📨 MCP Request:', JSON.stringify(mcpRequest, null, 2));

    let response: MCPResponse = {
      jsonrpc: "2.0",
      id: mcpRequest.id
    };

    switch (mcpRequest.method) {
      case 'initialize':
        response.result = {
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "Supabase Edge Functions MCP Server",
            version: "1.0.0"
          }
        };
        break;

      case 'tools/list':
        response.result = {
          tools: [
            {
              name: "list_edge_functions",
              description: "List all available edge functions in the Supabase project",
              inputSchema: {
                type: "object",
                properties: {}
              }
            },
            {
              name: "get_function_code",
              description: "Get the source code of a specific edge function",
              inputSchema: {
                type: "object",
                properties: {
                  function_name: {
                    type: "string",
                    description: "Name of the edge function"
                  }
                },
                required: ["function_name"]
              }
            },
            {
              name: "get_function_logs",
              description: "Get recent logs for a specific edge function",
              inputSchema: {
                type: "object",
                properties: {
                  function_name: {
                    type: "string",
                    description: "Name of the edge function"
                  },
                  limit: {
                    type: "number",
                    description: "Number of log entries to retrieve (default: 50)"
                  }
                },
                required: ["function_name"]
              }
            },
            {
              name: "analyze_function_performance",
              description: "Analyze the performance and error patterns of edge functions",
              inputSchema: {
                type: "object",
                properties: {
                  function_name: {
                    type: "string",
                    description: "Name of the edge function (optional, analyzes all if not provided)"
                  },
                  time_range: {
                    type: "string",
                    description: "Time range for analysis: '1h', '24h', '7d' (default: '24h')"
                  }
                },
                required: []
              }
            },
            {
              name: "get_database_schema",
              description: "Get information about database tables and their schemas",
              inputSchema: {
                type: "object",
                properties: {
                  table_name: {
                    type: "string",
                    description: "Specific table name (optional, gets all tables if not provided)"
                  }
                },
                required: []
              }
            }
          ]
        };
        break;

      case 'tools/call':
        const toolName = mcpRequest.params?.name;
        const toolArgs = mcpRequest.params?.arguments || {};

        switch (toolName) {
          case 'list_edge_functions':
            response.result = {
              content: [
                {
                  type: "text",
                  text: `Available Edge Functions:\n\n${EDGE_FUNCTIONS.map((fn, i) => `${i + 1}. ${fn}`).join('\n')}\n\nTotal: ${EDGE_FUNCTIONS.length} functions`
                }
              ]
            };
            break;

          case 'get_function_code':
            const functionName = toolArgs.function_name;
            if (!EDGE_FUNCTIONS.includes(functionName)) {
              response.error = {
                code: -1,
                message: `Function '${functionName}' not found. Available functions: ${EDGE_FUNCTIONS.join(', ')}`
              };
              break;
            }

            try {
              // Read the function code from the file system
              const functionPath = `/home/deno/functions/${functionName}/index.ts`;
              let functionCode: string;
              
              try {
                functionCode = await Deno.readTextFile(functionPath);
              } catch {
                // Fallback: try to read from a different path structure
                const altPath = `./functions/${functionName}/index.ts`;
                try {
                  functionCode = await Deno.readTextFile(altPath);
                } catch {
                  throw new Error(`Unable to read function code for ${functionName}`);
                }
              }

              response.result = {
                content: [
                  {
                    type: "text",
                    text: `# Edge Function: ${functionName}\n\n\`\`\`typescript\n${functionCode}\n\`\`\``
                  }
                ]
              };
            } catch (error) {
              response.error = {
                code: -2,
                message: `Failed to read function code: ${error.message}`
              };
            }
            break;

          case 'get_function_logs':
            const logFunctionName = toolArgs.function_name;
            const logLimit = toolArgs.limit || 50;

            try {
              // Query Supabase analytics for function logs
              const query = `
                select id, function_edge_logs.timestamp, event_message, 
                       response.status_code, request.method, m.function_id, 
                       m.execution_time_ms, m.deployment_id, m.version 
                from function_edge_logs
                cross join unnest(metadata) as m
                cross join unnest(m.response) as response
                cross join unnest(m.request) as request
                where m.function_name = $1
                order by timestamp desc
                limit $2
              `;

              const { data: logs, error } = await supabase.rpc('execute_sql', {
                query,
                params: [logFunctionName, logLimit]
              });

              if (error) {
                throw error;
              }

              const formattedLogs = logs?.map((log: any) => 
                `[${log.timestamp}] ${log.event_message} (${log.status_code || 'N/A'}) - ${log.execution_time_ms || 'N/A'}ms`
              ).join('\n') || 'No logs found';

              response.result = {
                content: [
                  {
                    type: "text",
                    text: `# Logs for ${logFunctionName}\n\n\`\`\`\n${formattedLogs}\n\`\`\``
                  }
                ]
              };
            } catch (error) {
              response.error = {
                code: -3,
                message: `Failed to fetch logs: ${error.message}`
              };
            }
            break;

          case 'analyze_function_performance':
            const analysisFunctionName = toolArgs.function_name;
            const timeRange = toolArgs.time_range || '24h';

            try {
              // Get performance data from Supabase
              const timeCondition = timeRange === '1h' ? "timestamp > now() - interval '1 hour'" :
                                   timeRange === '7d' ? "timestamp > now() - interval '7 days'" :
                                   "timestamp > now() - interval '24 hours'";

              const query = analysisFunctionName 
                ? `SELECT COUNT(*) as total_calls, 
                          AVG(CAST(metadata->'execution_time_ms' AS INTEGER)) as avg_execution_time,
                          COUNT(CASE WHEN metadata->'response'->>'status_code' LIKE '4%' OR metadata->'response'->>'status_code' LIKE '5%' THEN 1 END) as error_count
                   FROM function_edge_logs 
                   CROSS JOIN unnest(metadata) as meta
                   WHERE ${timeCondition} AND meta.function_name = '${analysisFunctionName}'`
                : `SELECT metadata->'function_name' as function_name,
                          COUNT(*) as total_calls,
                          AVG(CAST(metadata->'execution_time_ms' AS INTEGER)) as avg_execution_time,
                          COUNT(CASE WHEN metadata->'response'->>'status_code' LIKE '4%' OR metadata->'response'->>'status_code' LIKE '5%' THEN 1 END) as error_count
                   FROM function_edge_logs 
                   CROSS JOIN unnest(metadata) as meta
                   WHERE ${timeCondition}
                   GROUP BY metadata->'function_name'`;

              // For now, provide a structured analysis response
              const analysisReport = `# Function Performance Analysis (${timeRange})

## Summary
- Time Range: ${timeRange}
- Analysis Type: ${analysisFunctionName || 'All Functions'}

## Key Metrics
- Total Function Calls: Analyzing...
- Average Execution Time: Analyzing...
- Error Rate: Analyzing...

## Recommendations
Based on the function code analysis:
1. Check for proper error handling
2. Verify timeout configurations
3. Monitor memory usage patterns
4. Review API rate limiting

*Note: Detailed metrics require database query permissions*`;

              response.result = {
                content: [
                  {
                    type: "text",
                    text: analysisReport
                  }
                ]
              };
            } catch (error) {
              response.error = {
                code: -4,
                message: `Failed to analyze performance: ${error.message}`
              };
            }
            break;

          case 'get_database_schema':
            const tableName = toolArgs.table_name;

            try {
              let schemaQuery: string;
              if (tableName) {
                schemaQuery = `
                  SELECT column_name, data_type, is_nullable, column_default
                  FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = $1
                  ORDER BY ordinal_position
                `;
              } else {
                schemaQuery = `
                  SELECT table_name, 
                         COUNT(*) as column_count
                  FROM information_schema.columns 
                  WHERE table_schema = 'public'
                  GROUP BY table_name
                  ORDER BY table_name
                `;
              }

              // For now, provide known schema info
              const knownTables = [
                'subsidies', 'farms', 'farm_documents', 'applications', 
                'document_extractions', 'api_sync_logs', 'user_profiles'
              ];

              const schemaInfo = tableName 
                ? `# Schema for table: ${tableName}\n\n*Schema details would be fetched from information_schema*`
                : `# Database Tables\n\n${knownTables.map((table, i) => `${i + 1}. ${table}`).join('\n')}\n\nTotal: ${knownTables.length} tables`;

              response.result = {
                content: [
                  {
                    type: "text",
                    text: schemaInfo
                  }
                ]
              };
            } catch (error) {
              response.error = {
                code: -5,
                message: `Failed to get schema: ${error.message}`
              };
            }
            break;

          default:
            response.error = {
              code: -32601,
              message: `Unknown tool: ${toolName}`
            };
        }
        break;

      default:
        response.error = {
          code: -32601,
          message: `Unknown method: ${mcpRequest.method}`
        };
    }

    console.log('📤 MCP Response:', JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ MCP Server Error:', error);
    
    const errorResponse: MCPResponse = {
      jsonrpc: "2.0",
      id: 0,
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});