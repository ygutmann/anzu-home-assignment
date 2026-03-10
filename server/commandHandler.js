const COMMANDS = {
  PING: "PING",
  GET_TIME: "GET_TIME",
  RANDOM_NUMBER: "RANDOM_NUMBER"
};

const RESPONSES = {
  PONG: "PONG",
  UNKNOWN_COMMAND: "UNKNOWN_COMMAND"
};

function handleCommand(command) {
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

module.exports = {
  COMMANDS,
  RESPONSES,
  handleCommand
};