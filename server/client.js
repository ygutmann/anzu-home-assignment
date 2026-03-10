const net = require("net");

const HOST = "127.0.0.1";
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

const COMMANDS = {
  PING: "PING",
  GET_TIME: "GET_TIME",
  RANDOM_NUMBER: "RANDOM_NUMBER"
};

const RESPONSES = {
  PONG: "PONG",
  UNKNOWN_COMMAND: "UNKNOWN_COMMAND"
};

const client = new net.Socket();

function executeCommand(command) {
  switch (command) {
    case COMMANDS.PING:
      return RESPONSES.PONG;

    case COMMANDS.GET_TIME:
      return new Date().toISOString();

    case COMMANDS.RANDOM_NUMBER:
      return String(Math.floor(Math.random() * 100) + 1);

    default:
      return RESPONSES.UNKNOWN_COMMAND;
  }
}

function sendJsonMessage(socket, payload) {
  socket.write(JSON.stringify(payload));
}

function handleHandshake(socket, message) {
  if (
    message.type === MESSAGE_TYPES.HANDSHAKE &&
    message.message === HANDSHAKE_MESSAGES.HELLO_CLIENT
  ) {
    const handshakeResponse = {
      type: MESSAGE_TYPES.HANDSHAKE_RESPONSE,
      message: HANDSHAKE_MESSAGES.READY_FOR_COMMAND
    };

    console.log("Sending handshake response:", handshakeResponse);
    sendJsonMessage(socket, handshakeResponse);
    return true;
  }

  return false;
}

function handleCommandMessage(socket, message) {
  if (message.type !== MESSAGE_TYPES.COMMAND) {
    return;
  }

  const result = executeCommand(message.command);

  const responsePayload = {
    type: MESSAGE_TYPES.RESPONSE,
    command: message.command,
    result
  };

  console.log("Sending command response:", responsePayload);
  sendJsonMessage(socket, responsePayload);
}

client.connect(PORT, HOST, () => {
  console.log(`Connected to server at ${HOST}:${PORT}`);
});

client.on("data", (data) => {
  const rawMessage = data.toString();
  console.log("Received from server:", rawMessage);

  let parsedMessage;

  try {
    parsedMessage = JSON.parse(rawMessage);
  } catch (error) {
    console.error("Invalid JSON received from server");
    return;
  }

  const handshakeHandled = handleHandshake(client, parsedMessage);
  if (handshakeHandled) {
    return;
  }

  handleCommandMessage(client, parsedMessage);
});

client.on("close", () => {
  console.log("Connection closed");
});

client.on("error", (error) => {
  console.error("Client error:", error.message);
});