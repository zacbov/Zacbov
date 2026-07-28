/*
 * Test de validation : WiFi WPA2-Enterprise + fetch/parse ical ADE
 * Cible : ESP32 (Arduino core 2.x ou 3.x)
 * Sortie : moniteur serie 115200 bauds
 *
 * A executer AVANT tout achat de materiel definitif : ce test valide
 * les deux seuls points bloquants du projet (WPA2-Ent, comportement d'ADE
 * face a un client non-navigateur).
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include "esp_wpa2.h"   // Arduino core 3.x : renommer en esp_eap_client.h
#include <time.h>

// ========= CONFIG - a adapter =========
const char* SSID       = "TON_SSID";
const char* EAP_ID     = "ton_identifiant";
const char* EAP_USER   = "ton_identifiant";
const char* EAP_PASS   = "ton_ticket";

const char* ADE_HOST   = "adeconsult.app.u-pariscite.fr";
const char* ADE_PATH   = "/jsp/custom/modules/plannings/anonymous_cal.jsp"
                         "?resources=1277&projectId=2&calType=ical&nbWeeks=1";
// ======================================

struct Event {
  char start[6];
  char end[6];
  char summary[64];
};
Event events[24];
int   nEvents = 0;

char  today[9];
char  tomorrow[9];

bool connectWPA2Ent() {
  Serial.printf("[WiFi] Connexion WPA2-Ent a %s ...\n", SSID);
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);

  esp_wifi_sta_wpa2_ent_set_identity((uint8_t*)EAP_ID, strlen(EAP_ID));
  esp_wifi_sta_wpa2_ent_set_username((uint8_t*)EAP_USER, strlen(EAP_USER));
  esp_wifi_sta_wpa2_ent_set_password((uint8_t*)EAP_PASS, strlen(EAP_PASS));
  esp_wifi_sta_wpa2_ent_enable();

  WiFi.begin(SSID);

  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - t0 > 30000) {
      Serial.println("[WiFi] ECHEC (timeout 30 s)");
      return false;
    }
    delay(250);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] OK en %lu ms, IP=%s, RSSI=%d dBm\n",
                millis() - t0, WiFi.localIP().toString().c_str(), WiFi.RSSI());
  return true;
}

bool syncTime() {
  configTzTime("CET-1CEST,M3.5.0,M10.5.0/3", "pool.ntp.org", "time.nist.gov");
  struct tm tm_now;
  if (!getLocalTime(&tm_now, 10000)) {
    Serial.println("[NTP] ECHEC");
    return false;
  }
  strftime(today, sizeof(today), "%Y%m%d", &tm_now);
  time_t t = time(nullptr) + 86400;
  struct tm tm_tmr;
  localtime_r(&t, &tm_tmr);
  strftime(tomorrow, sizeof(tomorrow), "%Y%m%d", &tm_tmr);
  Serial.printf("[NTP] OK. Aujourd'hui=%s, demain=%s\n", today, tomorrow);
  return true;
}

long timezoneOffset(struct tm tmv) {
  time_t t = mktime(&tmv);
  struct tm utc_tm, loc_tm;
  gmtime_r(&t, &utc_tm);
  localtime_r(&t, &loc_tm);
  return (long)(mktime(&loc_tm) - mktime(&utc_tm));
}

void dtToLocalHHMM(const char* dt, char* out, bool isUTC) {
  struct tm tmv = {};
  tmv.tm_year = (dt[0]-'0')*1000 + (dt[1]-'0')*100 + (dt[2]-'0')*10 + (dt[3]-'0') - 1900;
  tmv.tm_mon  = (dt[4]-'0')*10 + (dt[5]-'0') - 1;
  tmv.tm_mday = (dt[6]-'0')*10 + (dt[7]-'0');
  tmv.tm_hour = (dt[9]-'0')*10 + (dt[10]-'0');
  tmv.tm_min  = (dt[11]-'0')*10 + (dt[12]-'0');
  if (isUTC) {
    time_t t = mktime(&tmv) - timezoneOffset(tmv);
    struct tm loc;
    localtime_r(&t, &loc);
    snprintf(out, 6, "%02d:%02d", loc.tm_hour, loc.tm_min);
  } else {
    snprintf(out, 6, "%02d:%02d", tmv.tm_hour, tmv.tm_min);
  }
}

void parseIcalStream(WiFiClientSecure& client, const char* dateFilter) {
  nEvents = 0;
  bool inEvent = false;
  char dtstart[20] = "", dtend[20] = "", summary[64] = "";
  bool startUTC = true, endUTC = true;

  String physical;
  uint32_t bytes = 0, lines = 0, vevents = 0;

  auto flushLine = [&](String& l) {
    lines++;
    if (l.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      dtstart[0] = dtend[0] = summary[0] = 0;
    }
    else if (l.startsWith("END:VEVENT")) {
      vevents++;
      inEvent = false;
      if (strncmp(dtstart, dateFilter, 8) == 0 && nEvents < 24) {
        Event& e = events[nEvents];
        dtToLocalHHMM(dtstart, e.start, startUTC);
        dtToLocalHHMM(dtend,   e.end,   endUTC);
        strncpy(e.summary, summary, 63);
        e.summary[63] = 0;
        nEvents++;
      }
    }
    else if (inEvent) {
      if (l.startsWith("DTSTART")) {
        int c = l.indexOf(':');
        strncpy(dtstart, l.c_str() + c + 1, 19);
        startUTC = l.endsWith("Z");
      }
      else if (l.startsWith("DTEND")) {
        int c = l.indexOf(':');
        strncpy(dtend, l.c_str() + c + 1, 19);
        endUTC = l.endsWith("Z");
      }
      else if (l.startsWith("SUMMARY")) {
        int c = l.indexOf(':');
        strncpy(summary, l.c_str() + c + 1, 63);
      }
    }
  };

  uint32_t lastData = millis();
  while (client.connected() || client.available()) {
    if (!client.available()) {
      if (millis() - lastData > 8000) break;
      delay(10);
      continue;
    }
    lastData = millis();
    String line = client.readStringUntil('\n');
    bytes += line.length() + 1;
    line.replace("\r", "");

    if (line.length() && (line[0] == ' ' || line[0] == '\t')) {
      physical += line.substring(1);
    } else {
      if (physical.length()) flushLine(physical);
      physical = line;
    }
  }
  if (physical.length()) flushLine(physical);

  Serial.printf("[ICAL] %lu octets, %lu lignes, %lu VEVENT au total\n",
                bytes, lines, vevents);
}

bool fetchAndParse(const char* dateFilter) {
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(15000);

  Serial.printf("[HTTP] GET https://%s%s\n", ADE_HOST, ADE_PATH);
  uint32_t t0 = millis();
  if (!client.connect(ADE_HOST, 443)) {
    Serial.println("[HTTP] ECHEC connexion TLS");
    return false;
  }
  Serial.printf("[HTTP] TLS OK en %lu ms\n", millis() - t0);

  client.printf("GET %s HTTP/1.1\r\n"
                "Host: %s\r\n"
                "User-Agent: ESP32-Planning/0.1\r\n"
                "Connection: close\r\n\r\n",
                ADE_PATH, ADE_HOST);

  String status = client.readStringUntil('\n');
  Serial.printf("[HTTP] %s\n", status.c_str());
  if (status.indexOf("200") < 0) {
    Serial.println("[HTTP] Statut inattendu - dump des 500 premiers octets :");
    Serial.println(client.readString().substring(0, 500));
    return false;
  }
  while (client.connected()) {
    String h = client.readStringUntil('\n');
    if (h == "\r" || h.length() <= 1) break;
  }

  parseIcalStream(client, dateFilter);
  client.stop();
  return true;
}

void printEvents() {
  if (nEvents == 0) {
    Serial.println("  (aucun evenement - salle libre)");
    return;
  }
  for (int i = 1; i < nEvents; i++)
    for (int j = i; j > 0 && strcmp(events[j].start, events[j-1].start) < 0; j--)
      { Event t = events[j]; events[j] = events[j-1]; events[j-1] = t; }

  for (int i = 0; i < nEvents; i++)
    Serial.printf("  %s - %s  %s\n", events[i].start, events[i].end, events[i].summary);
}

void halt() {
  Serial.println("Arret. Corrige la config et redemarre.");
  while (true) delay(1000);
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("\n===== TEST PLANNING ADE - ESP32 =====");
  Serial.printf("Heap libre : %lu octets\n", ESP.getFreeHeap());

  if (!connectWPA2Ent()) { halt(); }
  if (!syncTime())       { halt(); }

  Serial.println("\n--- Planning du JOUR ---");
  if (fetchAndParse(today)) printEvents();

  Serial.println("\n--- Planning de DEMAIN ---");
  if (fetchAndParse(tomorrow)) printEvents();

  Serial.printf("\nHeap libre final : %lu octets\n", ESP.getFreeHeap());
  Serial.println("===== FIN DU TEST =====");
  WiFi.disconnect(true);
}

void loop() {}
