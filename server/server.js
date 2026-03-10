const net = require("net");

const PORT = 3000;

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

function getRandomCommand() {
  const index = Math.floor(Math.random() * COMMANDS.length);
  return COMMANDS[index];
}

function sendJson(socket, payload) {
  socket.write(JSON.stringify(payload));
}

const server = net.createServer((socket) => {
  console.log("Client connected");

  let handshakeCompleted = false;

  sendJson(socket, {
    type: MESSAGE_TYPES.HANDSHAKE,
    message: HANDSHAKE_MESSAGES.HELLO_CLIENT
  });

  socket.on("data", (data) => {
    const rawMessage = data.toString();
    console.log("Received:", rawMessage);

    let parsedMessage;

    try {
      parsedMessage = JSON.parse(rawMessage);
    } catch (error) {
      console.log("Invalid JSON received from client");
      return;
    }

    if (
      parsedMessage.type === MESSAGE_TYPES.HANDSHAKE_RESPONSE &&
      parsedMessage.message === HANDSHAKE_MESSAGES.READY_FOR_COMMAND
    ) {
      handshakeCompleted = true;
      console.log("Handshake completed");

      sendJson(socket, {
        type: MESSAGE_TYPES.COMMAND,
        command: getRandomCommand()
      });
      return;
    }

    if (handshakeCompleted && parsedMessage.type === MESSAGE_TYPES.RESPONSE) {
      console.log(`Command "${parsedMessage.command}" result:`, parsedMessage.result);
    }
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });

  socket.on("error", (error) => {
    console.log("Socket error:", error.message);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});