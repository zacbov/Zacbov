#include <WiFi.h>
#include <time.h>
#include "config.h"
#include "cache.h"
#include "net.h"
#include "ical.h"
#include "render.h"
#include "portal.h"

int batteryPct = 100;

RTC_DATA_ATTR int  bootCount = 0;
RTC_DATA_ATTR bool rtcTrusted = false;   // faux apres changement de pile

static bool isSyncSlot(const struct tm& t) {
  return (t.tm_hour == SYNC_HOUR_1 && t.tm_min < 30) ||
         (t.tm_hour == SYNC_HOUR_2 && t.tm_min >= SYNC_MIN_2 - 5
                                   && t.tm_min <  SYNC_MIN_2 + 25);
}

// Prochain reveil : min(prochaine frontiere de creneau, prochaine synchro, 18h)
static uint64_t nextWakeupSec(const struct tm& now) {
  int nowMin = now.tm_hour * 60 + now.tm_min;
  int best = 24 * 60;

  auto consider = [&](int m) { if (m > nowMin && m < best) best = m; };
  consider(SYNC_HOUR_1 * 60);
  consider(SYNC_HOUR_2 * 60 + SYNC_MIN_2);
  consider(TOMORROW_HOUR * 60);

  Event* ev = (nowMin >= TOMORROW_HOUR * 60) ? cache_tomorrow() : cache_today();
  int n     = (nowMin >= TOMORROW_HOUR * 60) ? cache_nTomorrow() : cache_nToday();
  for (int i = 0; i < n; i++) {
    auto toMin = [](const char* s){ return (s[0]-'0')*600+(s[1]-'0')*60
                                          +(s[3]-'0')*10+(s[4]-'0'); };
    consider(toMin(ev[i].start));
    consider(toMin(ev[i].end));
  }
  int delta = best - nowMin;
  if (delta <= 0) delta = 24 * 60 - nowMin;
  return (uint64_t)(delta * 60 - now.tm_sec);
}

int readBatteryPct() {
  analogSetPinAttenuation(PIN_VBAT, ADC_11db);
  uint32_t mv = 0;
  for (int i = 0; i < 16; i++) mv += analogReadMilliVolts(PIN_VBAT);
  mv = (mv / 16) * 2;
  int pct = (int)((mv - 3300) * 100 / 900);
  return constrain(pct, 0, 100);
}

void setup() {
  Serial.begin(115200);
  bootCount++;
  pinMode(PIN_BTN, INPUT_PULLUP);
  pinMode(PIN_EPD_PWR, OUTPUT);
  digitalWrite(PIN_EPD_PWR, HIGH);   // ecran OFF par defaut

  // --- Mode config : bouton maintenu au boot ---
  delay(50);
  if (digitalRead(PIN_BTN) == LOW) { portal_run(); ESP.restart(); }

  batteryPct = readBatteryPct();
  cache_load();

  // --- Heure ---
  struct tm now;
  char today[9] = "", tomorrow[9] = "";
  bool haveTime = rtcTrusted && getLocalTime(&now, 0);

  bool needSync = !haveTime;
  if (haveTime) {
    strftime(today, 9, "%Y%m%d", &now);
    needSync = isSyncSlot(now) || !cache_valid(today);
  }

  // --- Synchro reseau si necessaire ---
  if (needSync) {
    if (net_connect() && net_syncTime()) {
      rtcTrusted = true;
      getLocalTime(&now, 0);
      strftime(today, 9, "%Y%m%d", &now);
      time_t t = time(nullptr) + 86400; struct tm tm2;
      localtime_r(&t, &tm2); strftime(tomorrow, 9, "%Y%m%d", &tm2);

      if (ical_fetch(today, tomorrow)) {
        char hhmm[6];
        snprintf(hhmm, 6, "%02d:%02d", now.tm_hour, now.tm_min);
        cache_save(hhmm);
      }
    }
    net_off();
    if (!rtcTrusted) {          // ni RTC ni reseau : reessai dans 30 min
      esp_sleep_enable_timer_wakeup(30ULL * 60 * 1000000);
      esp_deep_sleep_start();
    }
  }

  // --- Rendu ---
  render_init();
  bool showTomorrow = (now.tm_hour >= TOMORROW_HOUR);
  digitalWrite(PIN_EPD_PWR, LOW);   // ecran ON
  delay(20);
  if (showTomorrow) {
    struct tm d = now; d.tm_mday++; mktime(&d);
    render_planning(cache_tomorrow(), cache_nTomorrow(), d,
                    cache_sync(), true, cache_nTomorrow());
  } else {
    render_planning(cache_today(), cache_nToday(), now,
                    cache_sync(), false, cache_nTomorrow());
  }
  digitalWrite(PIN_EPD_PWR, HIGH);  // ecran OFF

  // --- Sommeil ---
  esp_sleep_enable_ext0_wakeup((gpio_num_t)PIN_BTN, 0);
  esp_sleep_enable_timer_wakeup(nextWakeupSec(now) * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}
