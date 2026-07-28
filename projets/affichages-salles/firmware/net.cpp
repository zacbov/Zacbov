#include <WiFi.h>
#include <Preferences.h>
#include <time.h>
#include "esp_wpa2.h"   // si Arduino core 3.x : remplacer par esp_eap_client.h
#include "config.h"

static Preferences p;

bool net_connect() {
  p.begin("cfg", true);
  String ssid = p.getString("ssid", "");
  String user = p.getString("user", "");
  String pass = p.getString("pass", "");
  p.end();

  if (ssid.length() == 0) {
    Serial.println("[WiFi] Pas de config - lancer le portail (bouton au boot)");
    return false;
  }

  Serial.printf("[WiFi] Connexion WPA2-Ent a %s ...\n", ssid.c_str());
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);

  esp_wifi_sta_wpa2_ent_set_identity((uint8_t*)user.c_str(), user.length());
  esp_wifi_sta_wpa2_ent_set_username((uint8_t*)user.c_str(), user.length());
  esp_wifi_sta_wpa2_ent_set_password((uint8_t*)pass.c_str(), pass.length());
  esp_wifi_sta_wpa2_ent_enable();   // pas de CA cert : a valider sur site

  WiFi.begin(ssid.c_str());

  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - t0 > 30000) {
      Serial.println("[WiFi] ECHEC (timeout 30 s)");
      return false;
    }
    delay(250);
  }
  Serial.printf("[WiFi] OK en %lu ms, IP=%s\n",
                millis() - t0, WiFi.localIP().toString().c_str());
  return true;
}

bool net_syncTime() {
  configTzTime("CET-1CEST,M3.5.0,M10.5.0/3", "pool.ntp.org", "time.nist.gov");
  struct tm tm_now;
  if (!getLocalTime(&tm_now, 10000)) {
    Serial.println("[NTP] ECHEC");
    return false;
  }
  Serial.println("[NTP] OK");
  return true;
}

void net_off() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
}
