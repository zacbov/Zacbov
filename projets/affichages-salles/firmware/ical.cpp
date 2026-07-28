#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <time.h>
#include "config.h"
#include "cache.h"

// Décalage local (CET/CEST) pour la date donnée
static long timezoneOffset(struct tm tmv) {
  time_t t = mktime(&tmv);
  struct tm utc_tm, loc_tm;
  gmtime_r(&t, &utc_tm);
  localtime_r(&t, &loc_tm);
  return (long)(mktime(&loc_tm) - mktime(&utc_tm));
}

static void dtToLocalHHMM(const char* dt, char* out, bool isUTC) {
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

// Parse le flux et remplit directement le cache (today / tomorrow)
static void parseIcalStream(WiFiClientSecure& client,
                            const char* todayStr, const char* tomorrowStr) {
  Event* evT = cache_today();    int& nT = cache_nToday();
  Event* evD = cache_tomorrow(); int& nD = cache_nTomorrow();
  nT = 0; nD = 0;

  bool inEvent = false;
  char dtstart[20] = "", dtend[20] = "", summary[64] = "";
  bool startUTC = true, endUTC = true;

  String physical;
  uint32_t lastData = millis();

  auto flushLine = [&](String& l) {
    if (l.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      dtstart[0] = dtend[0] = summary[0] = 0;
    } else if (l.startsWith("END:VEVENT")) {
      inEvent = false;
      Event e;
      if (strncmp(dtstart, todayStr, 8) == 0 && nT < MAX_EVENTS) {
        dtToLocalHHMM(dtstart, e.start, startUTC);
        dtToLocalHHMM(dtend,   e.end,   endUTC);
        strncpy(e.summary, summary, 63); e.summary[63] = 0;
        evT[nT++] = e;
      } else if (strncmp(dtstart, tomorrowStr, 8) == 0 && nD < MAX_EVENTS) {
        dtToLocalHHMM(dtstart, e.start, startUTC);
        dtToLocalHHMM(dtend,   e.end,   endUTC);
        strncpy(e.summary, summary, 63); e.summary[63] = 0;
        evD[nD++] = e;
      }
    } else if (inEvent) {
      if (l.startsWith("DTSTART")) {
        int c = l.indexOf(':');
        strncpy(dtstart, l.c_str() + c + 1, 19);
        startUTC = l.endsWith("Z");
      } else if (l.startsWith("DTEND")) {
        int c = l.indexOf(':');
        strncpy(dtend, l.c_str() + c + 1, 19);
        endUTC = l.endsWith("Z");
      } else if (l.startsWith("SUMMARY")) {
        int c = l.indexOf(':');
        strncpy(summary, l.c_str() + c + 1, 63);
      }
    }
  };

  while (client.connected() || client.available()) {
    if (!client.available()) {
      if (millis() - lastData > 8000) break;
      delay(10);
      continue;
    }
    lastData = millis();
    String line = client.readStringUntil('\n');
    line.replace("\r", "");
    if (line.length() && (line[0] == ' ' || line[0] == '\t')) {
      physical += line.substring(1);          // ligne repliee (RFC 5545)
    } else {
      if (physical.length()) flushLine(physical);
      physical = line;
    }
  }
  if (physical.length()) flushLine(physical);
}

bool ical_fetch(const char* todayStr, const char* tomorrowStr) {
  Preferences p;
  p.begin("cfg", true);
  int res = p.getInt("res", ADE_RESOURCE_DEFAULT);
  p.end();

  char path[160];
  snprintf(path, sizeof(path), ADE_PATH_FMT, res);

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(15000);

  if (!client.connect(ADE_HOST, 443)) {
    Serial.println("[HTTP] Echec connexion TLS");
    return false;
  }
  client.printf("GET %s HTTP/1.1\r\nHost: %s\r\n"
                "User-Agent: ESP32-Planning/1.0\r\nConnection: close\r\n\r\n",
                path, ADE_HOST);

  String status = client.readStringUntil('\n');
  if (status.indexOf("200") < 0) {
    Serial.printf("[HTTP] Statut inattendu: %s\n", status.c_str());
    client.stop();
    return false;
  }
  while (client.connected()) {
    String h = client.readStringUntil('\n');
    if (h.length() <= 1) break;
  }

  parseIcalStream(client, todayStr, tomorrowStr);
  client.stop();
  cache_setDateStamp(todayStr);
  return true;
}

// Utilise par le portail de config pour valider en un clic
bool ical_testFetch() {
  char today[9];
  struct tm now;
  if (!getLocalTime(&now, 5000)) return false;
  strftime(today, 9, "%Y%m%d", &now);
  time_t t = time(nullptr) + 86400;
  struct tm tm2; localtime_r(&t, &tm2);
  char tomorrow[9];
  strftime(tomorrow, 9, "%Y%m%d", &tm2);
  return ical_fetch(today, tomorrow);
}
