using System;
using System.Net.Sockets;
using System.Text;
using UnityEngine;

[Serializable]
public class NetworkMessage
{
    public string type;
    public string message;
    public string requestId;
    public string command;
    public string status;
    public string result;
    public string error;
}

public class NetworkClient : MonoBehaviour
{
    [SerializeField] private string serverHost = "127.0.0.1";
    [SerializeField] private int serverPort = 3000;

    private const string HandshakeType = "handshake";
    private const string HandshakeResponseType = "handshake_response";
    private const string CommandType = "command";
    private const string ResponseType = "response";

    private const string HelloClient = "HELLO_CLIENT";
    private const string ReadyForCommand = "READY_FOR_COMMAND";

    private const string PingCommand = "PING";
    private const string GetTimeCommand = "GET_TIME";
    private const string RandomNumberCommand = "RANDOM_NUMBER";

    private const string SuccessStatus = "success";
    private const string ErrorStatus = "error";

    private const string PongResponse = "PONG";
    private const string UnknownCommand = "UNKNOWN_COMMAND";

    private TcpClient tcpClient;
    private NetworkStream networkStream;
    private readonly byte[] receiveBuffer = new byte[1024];
    private readonly System.Random randomGenerator = new System.Random();

    private void Start()
    {
        Debug.Log("NetworkClient started.");
        ConnectToServer();
    }

    private void Update()
    {
        ReadIncomingMessage();
    }

    private void ConnectToServer()
    {
        try
        {
            tcpClient = new TcpClient();
            tcpClient.Connect(serverHost, serverPort);
            networkStream = tcpClient.GetStream();

            Debug.Log($"Connected to server: {serverHost}:{serverPort}");
        }
        catch (Exception exception)
        {
            Debug.LogError("Failed to connect to server: " + exception.Message);
        }
    }

    private void ReadIncomingMessage()
    {
        if (networkStream == null || !networkStream.DataAvailable)
        {
            return;
        }

        try
        {
            int bytesRead = networkStream.Read(receiveBuffer, 0, receiveBuffer.Length);

            if (bytesRead <= 0)
            {
                Debug.LogWarning("Server closed the connection.");
                return;
            }

            string rawMessage = Encoding.UTF8.GetString(receiveBuffer, 0, bytesRead);
            Debug.Log("Received from server: " + rawMessage);

            HandleIncomingMessage(rawMessage);
        }
        catch (Exception exception)
        {
            Debug.LogError("Failed to read from server: " + exception.Message);
        }
    }

    private void HandleIncomingMessage(string rawMessage)
    {
        NetworkMessage incomingMessage;

        try
        {
            incomingMessage = JsonUtility.FromJson<NetworkMessage>(rawMessage);
        }
        catch (Exception exception)
        {
            Debug.LogWarning("Failed to parse incoming message: " + exception.Message);
            return;
        }

        if (incomingMessage == null)
        {
            Debug.LogWarning("Received null or invalid message.");
            return;
        }

        if (incomingMessage.type == HandshakeType && incomingMessage.message == HelloClient)
        {
            Debug.Log("Handshake received from server.");
            SendReadyForCommand();
            return;
        }

        if (incomingMessage.type == CommandType)
        {
            if (!IsValidCommandMessage(incomingMessage))
            {
                Debug.LogWarning("Received invalid command message.");
                return;
            }

            string commandName = incomingMessage.command;
            string requestId = incomingMessage.requestId;

            Debug.Log($"Command received: {commandName} | requestId={requestId}");

            string commandResult = ExecuteCommand(commandName);
            SendCommandResponse(requestId, commandName, commandResult);
            return;
        }

        Debug.LogWarning("Received unsupported message format.");
    }

    private bool IsValidCommandMessage(NetworkMessage message)
    {
        if (message.type != CommandType)
        {
            return false;
        }

        if (string.IsNullOrEmpty(message.requestId))
        {
            return false;
        }

        if (string.IsNullOrEmpty(message.command))
        {
            return false;
        }

        return true;
    }

    private string ExecuteCommand(string commandName)
    {
        switch (commandName)
        {
            case PingCommand:
                return PongResponse;

            case GetTimeCommand:
                return DateTime.UtcNow.ToString("o");

            case RandomNumberCommand:
                return randomGenerator.Next(1, 101).ToString();

            default:
                return UnknownCommand;
        }
    }

    private void SendReadyForCommand()
    {
        NetworkMessage readyMessage = new NetworkMessage
        {
            type = HandshakeResponseType,
            message = ReadyForCommand
        };

        SendMessage(readyMessage);
        Debug.Log("Sent READY_FOR_COMMAND to server.");
    }

    private void SendCommandResponse(string requestId, string commandName, string result)
    {
        bool isKnownCommand = result != UnknownCommand;

        NetworkMessage responseMessage = new NetworkMessage
        {
            type = ResponseType,
            requestId = requestId,
            command = commandName,
            status = isKnownCommand ? SuccessStatus : ErrorStatus,
            result = isKnownCommand ? result : null,
            error = isKnownCommand ? null : UnknownCommand
        };

        SendMessage(responseMessage);

        if (isKnownCommand)
        {
            Debug.Log($"Sent success response | requestId={requestId} | command={commandName} | result={result}");
        }
        else
        {
            Debug.Log($"Sent error response | requestId={requestId} | command={commandName} | error={UnknownCommand}");
        }
    }

    private void SendMessage(NetworkMessage message)
    {
        if (networkStream == null)
        {
            Debug.LogWarning("Cannot send message because network stream is null.");
            return;
        }

        try
        {
            string jsonMessage = JsonUtility.ToJson(message);
            byte[] messageBytes = Encoding.UTF8.GetBytes(jsonMessage);
            networkStream.Write(messageBytes, 0, messageBytes.Length);
            networkStream.Flush();

            Debug.Log("Sent to server: " + jsonMessage);
        }
        catch (Exception exception)
        {
            Debug.LogError("Failed to send message to server: " + exception.Message);
        }
    }

    private void OnApplicationQuit()
    {
        if (networkStream != null)
        {
            networkStream.Close();
        }

        if (tcpClient != null)
        {
            tcpClient.Close();
            Debug.Log("TCP client connection closed.");
        }
    }
}