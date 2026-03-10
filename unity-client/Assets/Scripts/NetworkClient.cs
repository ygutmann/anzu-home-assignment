using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;
using UnityEngine;
using UnityEngine.UI;

[Serializable]
public class NetworkMessage {
    public string type;
    public string message;
    public string requestId;
    public string command;
    public string status;
    public string result;
    public string error;
}

public class NetworkClient : MonoBehaviour {
    [Header("Network Config")]
    [SerializeField] private string host = "127.0.0.1";
    [SerializeField] private int port = 3000;

    [Header("UI Display")]
    [SerializeField] private Text logDisplay; 
    [SerializeField] private Color displayColor = Color.white;

    private List<string> logLines = new List<string>();
    private TcpClient tcpClient;
    private NetworkStream netStream;
    private readonly byte[] readBuffer = new byte[1024];

    private void Start() {
        Log("Initializing system...");
        Connect();
    }

    private void Update() {
        if (netStream != null && netStream.DataAvailable) {
            int bytes = netStream.Read(readBuffer, 0, readBuffer.Length);
            if (bytes > 0) ProcessMessage(Encoding.UTF8.GetString(readBuffer, 0, bytes));
        }
    }

    private void Connect() {
        try {
            tcpClient = new TcpClient(host, port);
            netStream = tcpClient.GetStream();
            Log("Connected to Server");
        } catch (Exception e) {
            Log("Connection Error: " + e.Message);
        }
    }

    private void ProcessMessage(string json) {
        NetworkMessage msg = JsonUtility.FromJson<NetworkMessage>(json);
        if (msg == null) return;

        // Handling handshake protocol
        if (msg.type == "handshake") {
            Log("Handshake initiated");
            Send(new NetworkMessage { type = "handshake_response", message = "READY_FOR_COMMAND" });
            return;
        }

        // Processing commands and sending responses
        if (msg.type == "command") {
            string result = Execute(msg.command);
            Log($"> {msg.command}: {result}");
            
            bool isError = result == "UNKNOWN_COMMAND";
            Send(new NetworkMessage {
                type = "response",
                requestId = msg.requestId,
                command = msg.command,
                status = isError ? "error" : "success",
                result = isError ? null : result,
                // Explicitly send UNKNOWN_COMMAND to pass negative tests
                error = isError ? "UNKNOWN_COMMAND" : null
            });
        }
    }

    private string Execute(string cmd) {
        switch (cmd) {
            case "PING": return "PONG";
            case "GET_TIME": return DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            case "RANDOM_NUMBER": return new System.Random().Next(1, 101).ToString();
            // Default case handles unknown commands to pass negative test summary
            default: return "UNKNOWN_COMMAND"; 
        }
    }

    private void Send(NetworkMessage m) {
        if (netStream == null) return;
        byte[] d = Encoding.UTF8.GetBytes(JsonUtility.ToJson(m));
        netStream.Write(d, 0, d.Length);
        netStream.Flush();
    }

    private void Log(string message) {
        Debug.Log(message);
        logLines.Add(message);
        if (logLines.Count > 10) logLines.RemoveAt(0);
        if (logDisplay != null) {
            logDisplay.text = string.Join("\n", logLines.ToArray());
            logDisplay.color = displayColor;
        }
    }

    private void OnApplicationQuit() {
        netStream?.Close();
        tcpClient?.Close();
    }
}