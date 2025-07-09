import { spawn } from 'child_process';

// Start the server
const server = spawn('bun', ['run', 'src/index.ts'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

// Wait for server to start
setTimeout(async () => {
  console.log('Testing MCP server...');
  
  try {
    // Step 1: Initialize the server
    console.log('1. Initializing server...');
    const initResponse = await fetch('http://localhost:3000/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
          "protocolVersion": "2024-11-05",
          "capabilities": {},
          "clientInfo": {
            "name": "test-client",
            "version": "1.0.0"
          }
        }
      })
    });
    
    const initText = await initResponse.text();
    console.log('Init response:', initText);
    
    // Extract session ID from headers
    const sessionId = initResponse.headers.get('mcp-session-id');
    console.log('Session ID:', sessionId);
    
    if (!sessionId) {
      throw new Error('No session ID received from initialization');
    }
    
    // Step 2: Send initialized notification
    console.log('2. Sending initialized notification...');
    const initializedResponse = await fetch('http://localhost:3000/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
      })
    });
    
    console.log('Initialized response status:', initializedResponse.status);
    
    // Step 3: List tools
    console.log('3. Listing tools...');
    const toolsResponse = await fetch('http://localhost:3000/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
      })
    });
    
    const toolsText = await toolsResponse.text();
    console.log('Tools response:', toolsText);
    
    // Step 4: Test the save tool
    console.log('4. Testing save tool...');
    const saveResponse = await fetch('http://localhost:3000/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Mcp-Session-Id': sessionId,
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
          "name": "save",
          "arguments": {
            "info": "This is a test note from the MCP server!"
          }
        }
      })
    });
    
    const saveText = await saveResponse.text();
    console.log('Save response:', saveText);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  server.kill();
}, 3000);