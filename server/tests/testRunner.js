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

const testResults = [];
let currentCommandIndex = 0;
let handshakeCompleted = false;

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

function isValidRandomNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 100;
}

function validateCommandResponse(command, result) {
  switch (command) {
    case "PING":
      return result === "PONG"
        ? { ok: true, details: `Expected PONG, received ${result}` }
        : { ok: false, details: `Expected PONG, received ${result}` };

    case "GET_TIME":
      return isValidIsoDate(result)
        ? { ok: true, details: `Received valid ISO date: ${result}` }
        : { ok: false, details: `Invalid date format received: ${result}` };

    case "RANDOM_NUMBER":
      return isValidRandomNumber(result)
        ? { ok: true, details: `Received valid random number: ${result}` }
        : { ok: false, details: `Invalid random number received: ${result}` };

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

      const nextCommand = COMMANDS[currentCommandIndex];
      console.log(`Sending command: ${nextCommand}`);

      sendJson(socket, {
        type: MESSAGE_TYPES.COMMAND,
        command: nextCommand
      });
      return;
    }

    if (parsedMessage.type === MESSAGE_TYPES.RESPONSE) {
      const expectedCommand = COMMANDS[currentCommandIndex];

      if (parsedMessage.command !== expectedCommand) {
        logFail(
          "Command Order",
          `Expected response for ${expectedCommand}, received ${parsedMessage.command}`
        );
        printSummary();
        socket.end();
        server.close();
        return;
      }

      const validation = validateCommandResponse(parsedMessage.command, parsedMessage.result);

      if (validation.ok) {
        logPass(parsedMessage.command, validation.details);
      } else {
        logFail(parsedMessage.command, validation.details);
      }

      currentCommandIndex += 1;

      if (currentCommandIndex < COMMANDS.length) {
        const nextCommand = COMMANDS[currentCommandIndex];
        console.log(`Sending command: ${nextCommand}`);

        sendJson(socket, {
          type: MESSAGE_TYPES.COMMAND,
          command: nextCommand
        });
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