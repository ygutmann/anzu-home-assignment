const net = require("net");

const PORT = 3000;
const COMMAND_TIMEOUT_MS = 5000;

const MESSAGE_TYPES = {
  HANDSHAKE: "handshake",
  HANDSHAKE_RESPONSE: "handshake_response",
  COMMAND: "command",
  RESPONSE: "response"
};

const HANDSHAKE_MESSAGES = {
  HELLO_CLIENT: "HELLO_CLIENT",
  READY_FOR_COMMAND: "READY_FOR_COMMAND"
};

const COMMANDS = ["PING", "GET_TIME", "RANDOM_NUMBER"];

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

function isValidResponseMessage(message) {
  if (message.type !== MESSAGE_TYPES.RESPONSE) {
    return { ok: false, details: "Message type must be response" };
  }

  if (!message.requestId || typeof message.requestId !== "string") {
    return { ok: false, details: "Missing or invalid requestId" };
  }

  if (!message.command || typeof message.command !== "string") {
    return { ok: false, details: "Missing or invalid command" };
  }

  if (!message.status || !["success", "error"].includes(message.status)) {
    return { ok: false, details: "Missing or invalid status" };
  }

  if (message.status === "success" && !Object.prototype.hasOwnProperty.call(message, "result")) {
    return { ok: false, details: "Success response must include result" };
  }

  if (message.status === "error" && !message.error) {
    return { ok: false, details: "Error response must include error" };
  }

  return { ok: true };
}

function sendCommand(socket, command, setPendingRequest) {
  const requestId = createRequestId();

  const pendingRequest = {
    requestId,
    command,
    timeoutId: setTimeout(() => {
      console.log(
        `[ERROR] Timeout waiting for response | requestId=${requestId} | command=${command}`
      );
    }, COMMAND_TIMEOUT_MS)
  };

  setPendingRequest(pendingRequest);

  const payload = {
    type: MESSAGE_TYPES.COMMAND,
    requestId,
    command
  };

  console.log(`[INFO] Sending command | requestId=${requestId} | command=${command}`);
  sendJson(socket, payload);
}

const server = net.createServer((socket) => {
  console.log("[INFO] Client connected");

  let handshakeCompleted = false;
  let pendingRequest = null;

  function setPendingRequest(request) {
    pendingRequest = request;
  }

  sendJson(socket, {
    type: MESSAGE_TYPES.HANDSHAKE,
    message: HANDSHAKE_MESSAGES.HELLO_CLIENT
  });

  console.log("[INFO] Handshake sent");

  socket.on("data", (data) => {
    const rawMessage = data.toString();
    console.log(`[RECEIVED] ${rawMessage}`);

    let parsedMessage;

    try {
      parsedMessage = JSON.parse(rawMessage);
    } catch (error) {
      console.log("[ERROR] Invalid JSON received from client");
      return;
    }

    if (
      parsedMessage.type === MESSAGE_TYPES.HANDSHAKE_RESPONSE &&
      parsedMessage.message === HANDSHAKE_MESSAGES.READY_FOR_COMMAND
    ) {
      handshakeCompleted = true;
      console.log("[INFO] Handshake completed");

      sendCommand(socket, getRandomCommand(), setPendingRequest);
      return;
    }

    if (!handshakeCompleted) {
      console.log("[ERROR] Received message before handshake completion");
      return;
    }

    if (parsedMessage.type === MESSAGE_TYPES.RESPONSE) {
      const validation = isValidResponseMessage(parsedMessage);

      if (!validation.ok) {
        console.log(`[ERROR] Invalid response message | ${validation.details}`);
        return;
      }

      if (!pendingRequest) {
        console.log("[ERROR] Received response but no pending request exists");
        return;
      }

      if (parsedMessage.requestId !== pendingRequest.requestId) {
        console.log(
          `[ERROR] Request ID mismatch | expected=${pendingRequest.requestId} | actual=${parsedMessage.requestId}`
        );
        return;
      }

      if (parsedMessage.command !== pendingRequest.command) {
        console.log(
          `[ERROR] Command mismatch | expected=${pendingRequest.command} | actual=${parsedMessage.command}`
        );
        return;
      }

      clearTimeout(pendingRequest.timeoutId);

      if (parsedMessage.status === "success") {
        console.log(
          `[INFO] Command succeeded | requestId=${parsedMessage.requestId} | command=${parsedMessage.command} | result=${parsedMessage.result}`
        );
      } else {
        console.log(
          `[ERROR] Command failed | requestId=${parsedMessage.requestId} | command=${parsedMessage.command} | error=${parsedMessage.error}`
        );
      }

      pendingRequest = null;
    }
  });

  socket.on("end", () => {
    if (pendingRequest?.timeoutId) {
      clearTimeout(pendingRequest.timeoutId);
    }

    console.log("[INFO] Client disconnected");
  });

  socket.on("error", (error) => {
    if (pendingRequest?.timeoutId) {
      clearTimeout(pendingRequest.timeoutId);
    }

    console.log(`[ERROR] Socket error: ${error.message}`);
  });
});

server.listen(PORT, () => {
  console.log(`[INFO] Server listening on port ${PORT}`);
});