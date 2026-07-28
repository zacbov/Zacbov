/*
 * Inky Bird Frame — afficheur ESP32
 * ----------------------------------
 * Rôle : se réveiller, récupérer un buffer 1-bit 800x480 (48000 octets)
 *        depuis le Raspberry Pi en WiFi, l'afficher sur un Waveshare 7.5"
 *        e-Paper V2 (contrôleur UC8179), puis repartir en deep sleep.
 *
 * L'ESP32 ne connaît RIEN aux oiseaux : toute l'intelligence (écoute,
 * sonagramme, mise en page) est faite côté Pi. Ici on ne fait que
 * télécharger une image déjà prête et la coller à l'écran.
 *
 * Bibliothèques (Arduino Library Manager) :
 *   - "GxEPD2" par Jean-Marc Zingg   (installe aussi Adafruit GFX)
 * Carte : "ESP32 Dev Module" (ou XIAO/board équivalent) via le core esp32.
 *
 * Câblage — carte de driver e-Paper Waveshare pour ESP32 (mapping standard) :
 *   BUSY -> GPIO25   RST -> GPIO26   DC -> GPIO27   CS -> GPIO15
 *   CLK  -> GPIO13   DIN(MOSI) -> GPIO14
 * (Si tu utilises un autre montage, ajuste les broches ci-dessous.)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>

#include <GxEPD2_BW.h>

// ----------------------- À PERSONNALISER -----------------------
static const char* WIFI_SSID = "TON_WIFI";
static const char* WIFI_PASS = "TON_MOT_DE_PASSE";

// Adresse du serveur de rendu sur le Pi.
// Conseil : mets l'IP fixe du Pi (ex. http://192.168.1.42:8090/frame.bin).
// Le .local fonctionne aussi (résolu par mDNS ci-dessous) mais est moins fiable.
static const char* FRAME_URL = "http://birdpi.local:8090/frame.bin";

// Intervalle de réveil (minutes). L'e-ink garde l'image sans courant,
// donc l'ESP32 dort tout le reste du temps -> très basse conso.
static const uint32_t SLEEP_MINUTES = 15;

// Passe à true si l'image sort en négatif.
static const bool INVERT = false;
// ---------------------------------------------------------------

// Broches e-Paper (carte driver Waveshare ESP32).
#define PIN_BUSY 25
#define PIN_RST  26
#define PIN_DC   27
#define PIN_CS   15
#define PIN_CLK  13
#define PIN_DIN  14   // MOSI

// Dalle 7.5" V2 800x480, contrôleur UC8179.
#define GxEPD2_DRIVER_CLASS GxEPD2_750_T7
GxEPD2_BW<GxEPD2_DRIVER_CLASS, GxEPD2_DRIVER_CLASS::HEIGHT> display(
    GxEPD2_DRIVER_CLASS(/*CS=*/PIN_CS, /*DC=*/PIN_DC, /*RST=*/PIN_RST, /*BUSY=*/PIN_BUSY));

static const int W = 800;
static const int H = 480;
static const size_t FRAME_BYTES = (size_t)W * H / 8;   // 48000

// Buffer image en RAM. 48 Ko : OK sur un ESP32 classique en HTTP (pas TLS).
static uint8_t framebuf[FRAME_BYTES];

// ------------------------------------------------------------------

void goToSleep() {
  Serial.printf("Deep sleep %u min…\n", SLEEP_MINUTES);
  esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_MINUTES * 60ULL * 1000000ULL);
  esp_deep_sleep_start();
}

bool connectWiFi(uint32_t timeout_ms = 20000) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeout_ms) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();
  return WiFi.status() == WL_CONNECTED;
}

// Remplace un éventuel "hote.local" par son IP via mDNS.
String resolveUrl(const String& url) {
  int schemeEnd = url.indexOf("://");
  if (schemeEnd < 0) return url;
  int hostStart = schemeEnd + 3;
  int hostEnd = url.indexOf(':', hostStart);
  int slash = url.indexOf('/', hostStart);
  if (hostEnd < 0 || (slash >= 0 && slash < hostEnd)) hostEnd = slash;
  if (hostEnd < 0) hostEnd = url.length();
  String host = url.substring(hostStart, hostEnd);
  if (!host.endsWith(".local")) return url;

  String name = host.substring(0, host.length() - 6);  // retire ".local"
  if (!MDNS.begin("inky-bird-frame")) return url;
  IPAddress ip = MDNS.queryHost(name);
  if (ip == IPAddress((uint32_t)0)) return url;
  String out = url;
  out.replace(host, ip.toString());
  Serial.printf("mDNS %s -> %s\n", host.c_str(), ip.toString().c_str());
  return out;
}

// Télécharge exactement FRAME_BYTES octets dans framebuf. true si succès.
bool downloadFrame() {
  String url = resolveUrl(FRAME_URL);
  HTTPClient http;
  http.setConnectTimeout(8000);
  http.setTimeout(8000);
  if (!http.begin(url)) return false;

  int code = http.GET();
  if (code != HTTP_CODE_OK) {
    Serial.printf("HTTP %d\n", code);
    http.end();
    return false;
  }

  int len = http.getSize();  // -1 si inconnu
  WiFiClient* stream = http.getStreamPtr();
  size_t got = 0;
  uint32_t last = millis();
  while (got < FRAME_BYTES) {
    size_t avail = stream->available();
    if (avail) {
      int r = stream->readBytes(framebuf + got, min(avail, FRAME_BYTES - got));
      if (r > 0) { got += r; last = millis(); }
    } else {
      if (!http.connected() && stream->available() == 0) break;
      if (millis() - last > 8000) break;   // anti-blocage
      delay(5);
    }
  }
  http.end();

  Serial.printf("Reçu %u / %u octets\n", (unsigned)got, (unsigned)FRAME_BYTES);
  return got == FRAME_BYTES;
}

void showFrame() {
  display.init(115200, true, 2, false);
  // Remap SPI vers les broches de la carte Waveshare (SCK, MISO, MOSI, SS).
  SPI.end();
  SPI.begin(PIN_CLK, /*MISO=*/12, PIN_DIN, PIN_CS);

  display.setRotation(0);
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    // bit=1 -> blanc (format PIL '1' côté Pi). invert géré ici si besoin.
    display.drawImage(framebuf, 0, 0, W, H, INVERT, false, false);
  } while (display.nextPage());

  display.hibernate();
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\nInky Bird Frame — réveil");

  if (connectWiFi()) {
    if (downloadFrame()) {
      showFrame();
      Serial.println("Écran mis à jour.");
    } else {
      Serial.println("Échec téléchargement — on garde l'image précédente.");
    }
  } else {
    Serial.println("WiFi indisponible — on garde l'image précédente.");
  }

  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  goToSleep();
}

void loop() {
  // Jamais atteint : setup() se termine par un deep sleep.
}
