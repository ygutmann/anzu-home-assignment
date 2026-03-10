# Server–Unity TCP Communication

A simple TCP-based communication system between a **Node.js server** and a **Unity client**, implemented as part of a Junior QA Engineer home assignment.

The project demonstrates a minimal client-server architecture including:

- TCP socket communication
- Client-server handshake
- Command-based interaction
- Structured JSON messaging
- Unit testing and end-to-end smoke testing


---

# System Architecture

The system consists of two main components: a **Node.js server** and a **Unity client** communicating over a TCP connection.

```
Unity Client  <---- TCP JSON Messages ---->  Node.js Server
```

The typical flow is:

1. Client connects to the server
2. Server performs a handshake
3. Server sends a command
4. Client executes the command
5. Client sends a response back


---

# Server (Node.js)

The server is responsible for managing the communication lifecycle.

Main responsibilities:

- Open a TCP socket
- Accept incoming client connections
- Perform a handshake
- Send commands to the client
- Receive and log responses

The server communicates using **JSON messages over TCP**.

Key components:

- `server.js` — main TCP server implementation
- `commandHandler.js` — command logic abstraction
- `tests/` — unit tests and smoke tests

Testing includes:

- **Unit tests** for command logic using Jest
- **End-to-end smoke test runner** validating the full communication flow


---

# Unity Client

The Unity client connects to the server and executes commands.

Responsibilities:

- Connect to the server using `TcpClient`
- Receive JSON messages
- Identify message type (handshake / command)
- Execute the requested command
- Send a response back to the server

The client is implemented in **C# using Unity 2018**.


---

# Supported Commands

| Command | Description |
|-------|-------------|
| `PING` | Client responds with `PONG` |
| `GET_TIME` | Client returns the current system time |
| `RANDOM_NUMBER` | Client returns a randomly generated number |

Example command message:

```json
{
  "type": "command",
  "command": "PING"
}
```

Example response:

```json
{
  "type": "response",
  "result": "PONG"
}
```


---

# Project Structure

```
project-root
│
├── server
│   ├── server.js
│   ├── commandHandler.js
│   ├── client.js
│   ├── package.json
│   ├── package-lock.json
│   │
│   └── tests
│       ├── commandHandler.test.js
│       └── testRunner.js
│
├── unity-client
│   ├── Assets
│   ├── Packages
│   └── ProjectSettings
│
└── .gitignore
```


---

# Setup Requirements

## Node.js

Recommended version:

```
Node.js 16+
```

Install dependencies:

```bash
cd server
npm install
```


## Unity

Requirements:

- Unity **2018**
- Unity Hub

Open the following folder as a Unity project:

```
unity-client
```


---

# Running the Server

Start the server with:

```bash
cd server
node server.js
```

The server will:

1. Listen on port **3000**
2. Wait for a Unity client connection
3. Send a handshake message
4. Send a random command
5. Print the response received from the client


---

# Running the Unity Client

1. Open **Unity Hub**
2. Add the `unity-client` folder
3. Open the project using **Unity 2018**
4. Press **Play**

The client will:

- Connect to the Node.js server
- Wait for commands
- Execute the requested command
- Send responses back to the server


---

# Running Tests

The server includes both **unit tests** and a **simple smoke test runner**.

## Run unit tests

```bash
cd server
npm test
```

These tests validate the command handler logic.


## Run the smoke test runner

```bash
cd server
node tests/testRunner.js
```

The test runner validates:

- handshake communication
- `PING`
- `GET_TIME`
- `RANDOM_NUMBER`

Each step prints **PASS / FAIL** results.


---

# Design Decisions

### JSON Message Protocol

Messages are transmitted as JSON to keep communication:

- readable
- easy to debug
- easy to extend


### Command Handler Separation

Command logic was extracted into a dedicated module:

```
commandHandler.js
```

This improves:

- code readability
- maintainability
- testability


### Smoke Testing

In addition to unit tests, a lightweight **end-to-end smoke test** verifies the full communication flow.


### Minimal Dependencies

The server uses minimal external dependencies to keep the implementation simple and focused on networking logic.


---

# Error Handling

Basic error handling was implemented for:

- malformed JSON messages
- unknown commands
- socket connection errors

Errors are logged to the console for easier debugging.


---

# Limitations

This project intentionally keeps the architecture simple and does not include:

- multi-client support
- retry mechanisms
- reconnection logic
- authentication
- message queuing


---

# Possible Improvements

Future improvements could include:

- supporting multiple simultaneous clients
- implementing a more structured message protocol
- improved logging
- timeout handling
- integration tests
- a command registry system for easier extensibility
