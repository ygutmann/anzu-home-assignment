const { handleCommand, COMMANDS, RESPONSES } = require("../commandHandler");

describe("handleCommand", () => {
  test('returns "PONG" for "PING"', () => {
    expect(handleCommand(COMMANDS.PING)).toBe(RESPONSES.PONG);
  });

  test("returns a valid ISO date string for GET_TIME", () => {
    const result = handleCommand(COMMANDS.GET_TIME);

    expect(typeof result).toBe("string");
    expect(() => new Date(result).toISOString()).not.toThrow();
  });

  test("returns a number between 1 and 100 for RANDOM_NUMBER", () => {
    const result = handleCommand(COMMANDS.RANDOM_NUMBER);

    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(100);
  });

  test('returns "UNKNOWN_COMMAND" for unsupported command', () => {
    expect(handleCommand("DO_SOMETHING")).toBe(RESPONSES.UNKNOWN_COMMAND);
  });
});