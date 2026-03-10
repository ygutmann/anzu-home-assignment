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

const COMMANDS = ["PING", "GET_TIME", "RANDOM_NUMBER", "DO_SOMETHING"];

const testResults = [];
let currentCommandIndex = 0;
let handshakeCompleted = false;
let currentRequestId = null;

function logPass(step, details) {
  testResults.push({ step, status: "PASS", details });
  console.log(`PASS | ${step} | ${details}`);
}

function logFail(step, details) {
  testResults.push({ step, status: "FAIL", details });
  console.log(`FAIL | ${step} | ${details}`);
}

function sendJson(socket, payload) {
  socket.write(JSON.stringify(payload));
}

function isValidIsoDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && value.includes("T");
}

function isValidRandomNumberString(value) {
  if (typeof value !== "string") {
    return false;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100;
}

function validateCommandResponse(command, message) {
  if (message.requestId !== currentRequestId) {
    return {
      ok: false,
      details: `Expected requestId ${currentRequestId}, received ${message.requestId}`
    };
  }

  if (message.command !== command) {
    return {
      ok: false,
      details: `Expected command ${command}, received ${message.command}`
    };
  }

  if (!message.status || !["success", "error"].includes(message.status)) {
    return {
      ok: false,
      details: `Invalid status received: ${message.status}`
    };
  }

  switch (command) {
    case "PING":
      if (message.status !== "success") {
        return { ok: false, details: `Expected success status, received ${message.status}` };
      }

      return message.result === "PONG"
        ? { ok: true, details: `Expected PONG, received ${message.result}` }
        : { ok: false, details: `Expected PONG, received ${message.result}` };

    case "GET_TIME":
      if (message.status !== "success") {
        return { ok: false, details: `Expected success status, received ${message.status}` };
      }

      return isValidIsoDate(message.result)
        ? { ok: true, details: `Received valid ISO date: ${message.result}` }
        : { ok: false, details: `Invalid date format received: ${message.result}` };

    case "RANDOM_NUMBER":
      if (message.status !== "success") {
        return { ok: false, details: `Expected success status, received ${message.status}` };
      }

      return isValidRandomNumberString(message.result)
        ? { ok: true, details: `Received valid random number: ${message.result}` }
        : { ok: false, details: `Invalid random number received: ${message.result}` };

    case "DO_SOMETHING":
      if (message.status !== "error") {
        return { ok: false, details: `Expected error status, received ${message.status}` };
      }

      return message.error === "UNKNOWN_COMMAND"
        ? { ok: true, details: "Received expected UNKNOWN_COMMAND error" }
        : { ok: false, details: `Expected UNKNOWN_COMMAND, received ${message.error}` };

    default:
      return { ok: false, details: `Unknown command: ${command}` };
  }
}

function printSummary() {
  console.log("\n===== TEST SUMMARY =====");

  const passed = testResults.filter((test) => test.status === "PASS").length;
  const failed = testResults.filter((test) => test.status === "FAIL").length;

  testResults.forEach((test) => {
    console.log(`${test.status} | ${test.step} | ${test.details}`);
  });

  console.log("\n========================");
  console.log(`Total: ${testResults.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("========================\n");
}

function sendNextCommand(socket) {
  const nextCommand = COMMANDS[currentCommandIndex];
  currentRequestId = `req-${currentCommandIndex + 1}`;

  console.log(`Sending command: ${nextCommand} | requestId=${currentRequestId}`);

  sendJson(socket, {
    type: MESSAGE_TYPES.COMMAND,
    requestId: currentRequestId,
    command: nextCommand
  });
}

const server = net.createServer((socket) => {
  console.log("Client connected to test runner");

  sendJson(socket, {
    type: MESSAGE_TYPES.HANDSHAKE,
    message: HANDSHAKE_MESSAGES.HELLO_CLIENT
  });

  console.log("Sent handshake to client");

  socket.on("data", (data) => {
    const rawMessage = data.toString();
    console.log("Received:", rawMessage);

    let parsedMessage;

    try {
      parsedMessage = JSON.parse(rawMessage);
    } catch (error) {
      logFail("JSON Parsing", `Invalid JSON received: ${rawMessage}`);
      printSummary();
      socket.end();
      server.close();
      return;
    }

    if (
      !handshakeCompleted &&
      parsedMessage.type === MESSAGE_TYPES.HANDSHAKE_RESPONSE &&
      parsedMessage.message === HANDSHAKE_MESSAGES.READY_FOR_COMMAND
    ) {
      handshakeCompleted = true;
      logPass("Handshake", "Client responded with READY_FOR_COMMAND");
      sendNextCommand(socket);
      return;
    }

    if (parsedMessage.type === MESSAGE_TYPES.RESPONSE) {
      const expectedCommand = COMMANDS[currentCommandIndex];
      const validation = validateCommandResponse(expectedCommand, parsedMessage);

      if (validation.ok) {
        logPass(expectedCommand, validation.details);
      } else {
        logFail(expectedCommand, validation.details);
        printSummary();
        socket.end();
        server.close();
        return;
      }

      currentCommandIndex += 1;

      if (currentCommandIndex < COMMANDS.length) {
        sendNextCommand(socket);
      } else {
        printSummary();
        socket.end();
        server.close();
      }
    }
  });

  socket.on("error", (error) => {
    logFail("Socket", error.message);
    printSummary();
    server.close();
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Test runner listening on port ${PORT}`);
  console.log("Start the Unity client now to run the tests.");
});