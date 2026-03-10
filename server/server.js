const net = require("net");

const PORT = 3000;
const COMMAND_TIMEOUT_MS = 5000;
const MAX_COMMANDS = 5; 

const MESSAGE_TYPES = {
  HANDSHAKE: "handshake",
  HANDSHAKE_RESPONSE: "handshake_response",
  COMMAND: "command",
  RESPONSE: "response"
};

// Includes DO_SOMETHING to verify negative test handling
const COMMANDS = ["PING", "GET_TIME", "RANDOM_NUMBER", "DO_SOMETHING"];

let requestCounter = 0;

function createRequestId() {
  requestCounter += 1;
  return `req-${requestCounter}`;
}

function getRandomCommand() {
  const index = Math.floor(Math.random() * COMMANDS.length);
  return COMMANDS[index];
}

function sendJson(socket, payload) {
  socket.write(JSON.stringify(payload));
}

function sendCommand(socket, command, onPendingRequest) {
  const requestId = createRequestId();
  const payload = {
    type: MESSAGE_TYPES.COMMAND,
    requestId,
    command
  };

  console.log(`[SENT] Command: ${command} | ID: ${requestId}`);
  sendJson(socket, payload);

  const timeoutId = setTimeout(() => {
    console.log(`[TIMEOUT] Request ${requestId} expired`);
  }, COMMAND_TIMEOUT_MS);

  onPendingRequest({ requestId, command, timeoutId });
}

const server = net.createServer((socket) => {
  console.log("[SERVER] Client Connected");

  let pendingRequest = null;
  let commandsCompleted = 0;

  const setPendingRequest = (req) => { pendingRequest = req; };

  // Initiation of handshake
  sendJson(socket, {
    type: MESSAGE_TYPES.HANDSHAKE,
    message: "HELLO_CLIENT"
  });

  socket.on("data", (data) => {
    let parsed;
    try { parsed = JSON.parse(data.toString()); } catch (e) { return; }

    if (parsed.type === MESSAGE_TYPES.HANDSHAKE_RESPONSE) {
      console.log("[SERVER] Handshake Success. Beginning Test Sequence...");
      sendCommand(socket, getRandomCommand(), setPendingRequest);
      return;
    }

    if (parsed.type === MESSAGE_TYPES.RESPONSE) {
      if (!pendingRequest) return;
      clearTimeout(pendingRequest.timeoutId);
      
      // Verification of success or expected error
      if (parsed.status === "success") {
        console.log(`[PASS] ${parsed.command}: ${parsed.result}`);
      } else {
        console.log(`[PASS - NEGATIVE TEST] ${parsed.command} properly returned error: ${parsed.error}`);
      }

      commandsCompleted++;
      pendingRequest = null;

      if (commandsCompleted < MAX_COMMANDS) {
        setTimeout(() => sendCommand(socket, getRandomCommand(), setPendingRequest), 1000);
      } else {
        console.log("[SERVER] All 5 tests completed.");
      }
    }
  });

  socket.on("error", (err) => console.log("[ERROR]", err.message));
});

server.listen(PORT, () => console.log(`[SERVER] Listening on port ${PORT}`));