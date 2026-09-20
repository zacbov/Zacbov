using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// Événement générique échangé entre le client AR (Watson) et le client VR (Holmes)
/// via le serveur relais. Sérialisé en JSON.
/// </summary>
[Serializable]
public class GameEvent
{
    public string type;       // ex: "clue_observed_ar", "clue_revealed_vr", "all_clues_ready"
    public string clueId;
    public bool isRedHerring;
    public string payload;    // texte libre optionnel (ex: description de Watson)
}

/// <summary>
/// Client WebSocket minimal. Se connecte au serveur relais (brique 2 du prototype),
/// envoie les événements générés côté VR, et reçoit ceux du côté AR.
/// Remplacer l'URL par celle du serveur relais réel avant build.
/// </summary>
public class NetworkClient : MonoBehaviour
{
    public static NetworkClient Instance { get; private set; }

    [Header("Configuration")]
    public string serverUrl = "ws://localhost:8080"; // à remplacer par l'adresse du relais en LAN ou distant
    public string sessionCode = "TEST_SESSION";
    public float fallbackSeedDelay = 5f; // secondes avant de générer un seed local si le relais ne répond pas

    private ClientWebSocket socket;
    private CancellationTokenSource cts;
    private bool seedReceived = false;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private async void Start()
    {
        await Connect();
        _ = FallbackSeedTimer();
    }

    private async Task FallbackSeedTimer()
    {
        await Task.Delay((int)(fallbackSeedDelay * 1000));
        if (!seedReceived)
        {
            Debug.LogWarning("[NetworkClient] Aucun seed reçu du relais — génération locale de secours.");
            CaseManager.Instance?.GenerateCase(Environment.TickCount);
        }
    }

    public async Task Connect()
    {
        socket = new ClientWebSocket();
        cts = new CancellationTokenSource();

        try
        {
            Uri uri = new Uri($"{serverUrl}?session={sessionCode}&role=vr");
            await socket.ConnectAsync(uri, cts.Token);
            Debug.Log("[NetworkClient] Connecté au serveur relais.");
            _ = ReceiveLoop();
        }
        catch (Exception e)
        {
            Debug.LogError($"[NetworkClient] Échec de connexion : {e.Message}");
        }
    }

    public async void SendEvent(GameEvent evt)
    {
        if (socket == null || socket.State != WebSocketState.Open) return;

        string json = JsonUtility.ToJson(evt);
        byte[] bytes = Encoding.UTF8.GetBytes(json);

        try
        {
            await socket.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                true,
                cts.Token
            );
        }
        catch (Exception e)
        {
            Debug.LogError($"[NetworkClient] Erreur d'envoi : {e.Message}");
        }
    }

    private async Task ReceiveLoop()
    {
        var buffer = new byte[4096];

        while (socket.State == WebSocketState.Open)
        {
            try
            {
                var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
                if (result.MessageType == WebSocketMessageType.Close) break;

                string json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                GameEvent evt = JsonUtility.FromJson<GameEvent>(json);
                HandleIncomingEvent(evt);
            }
            catch (Exception e)
            {
                Debug.LogError($"[NetworkClient] Erreur de réception : {e.Message}");
                break;
            }
        }
    }

    private void HandleIncomingEvent(GameEvent evt)
    {
        Debug.Log($"[NetworkClient] Événement reçu : {evt.type} ({evt.clueId}) — {evt.payload}");

        if (evt.type == "session_seed" && int.TryParse(evt.payload, out int receivedSeed))
        {
            seedReceived = true;
            CaseManager.Instance?.GenerateCase(receivedSeed);
        }

        // À brancher : par exemple mettre en surbrillance l'objet correspondant
        // dans le Palais mental quand Watson signale une observation côté AR.
        // if (evt.type == "clue_observed_ar") { ... }
    }

    private async void OnApplicationQuit()
    {
        if (socket != null && socket.State == WebSocketState.Open)
        {
            await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Quitting", CancellationToken.None);
        }
        cts?.Cancel();
    }
}
