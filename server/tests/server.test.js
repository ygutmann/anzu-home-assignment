/**
 * Server-Side Logic & Handshake Implementation
 * Requirement: Create a server using Node.js/Jest 
 * Requirement: Implement a handshake with clients 
 */

const ServerLogic = {
    // Generates the initial handshake command 
    handleHandshake: () => {
        return {
            command: "INIT_SESSION",
            payload: {
                message: "Welcome to Unity-Server Bridge",
                action: "SYNC_CLOCK"
            },
            timestamp: new Date().toISOString()
        };
    },

    // Processes responses returned from the Unity client 
    // Requirement: Look for possible errors/logical problems 
    processClientResponse: (response) => {
        if (!response || typeof response !== 'object') {
            return { status: "error", message: "Invalid response format" };
        }

        if (response.status === "success") {
            return { status: "ok", action: "ACKNOWLEDGED" };
        }

        return { status: "failed", message: "Client reported an issue" };
    }
};

/**
 * Jest Test Suite
 * Requirement: Use Jest for testing 
 * Requirement: Performance and error handling 
 */

describe('Server-Unity Communication Tests', () => {

    // Test for the Handshake Requirement 
    test('Handshake should initiate with a command and wait for response', () => {
        const handshakeData = ServerLogic.handleHandshake();
        
        expect(handshakeData).toHaveProperty('command'); // Check if command exists 
        expect(handshakeData.command).toBe("INIT_SESSION");
        expect(typeof handshakeData.timestamp).toBe('string');
    });

    // Test for Client Response Handling 
    test('Server should correctly parse a successful response from Unity', () => {
        const mockUnityResponse = { status: "success", taskId: 1 };
        const result = ServerLogic.processClientResponse(mockUnityResponse);
        
        expect(result.status).toBe("ok");
    });

    // Test for Error Handling 
    test('Server should handle malformed or null responses gracefully', () => {
        const nullResult = ServerLogic.processClientResponse(null);
        const stringResult = ServerLogic.processClientResponse("not_an_object");

        expect(nullResult.status).toBe("error");
        expect(stringResult.status).toBe("error");
    });

    // Performance/Timing check (brief) 
    test('Handshake generation should be fast (under 10ms)', () => {
        const start = performance.now();
        ServerLogic.handleHandshake();
        const end = performance.now();
        
        expect(end - start).toBeLessThan(10);
    });
});

module.exports = ServerLogic; // Export for use in the actual Node app