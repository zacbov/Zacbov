#include <Preferences.h>
#include "config.h"

static Preferences prefs;
static Event evToday[MAX_EVENTS], evTomorrow[MAX_EVENTS];
static int nToday = 0, nTomorrow = 0;
static char lastSync[6] = "--:--";
static char cachedDate[9] = "";

void cache_setDateStamp(const char* d) { strncpy(cachedDate, d, 8); cachedDate[8] = 0; }
const char* cache_dateStamp() { return cachedDate; }

void cache_load() {
  prefs.begin("planning", true);
  nToday    = prefs.getInt("nT", 0);
  nTomorrow = prefs.getInt("nD", 0);
  prefs.getBytes("evT", evToday,    sizeof(Event) * nToday);
  prefs.getBytes("evD", evTomorrow, sizeof(Event) * nTomorrow);
  String s = prefs.getString("sync", "--:--");
  strncpy(lastSync, s.c_str(), 5);
  String d = prefs.getString("date", "");
  strncpy(cachedDate, d.c_str(), 8); cachedDate[8] = 0;
  prefs.end();
}

void cache_save(const char* syncHHMM) {
  prefs.begin("planning", false);
  prefs.putInt("nT", nToday);
  prefs.putInt("nD", nTomorrow);
  prefs.putBytes("evT", evToday,    sizeof(Event) * nToday);
  prefs.putBytes("evD", evTomorrow, sizeof(Event) * nTomorrow);
  prefs.putString("sync", syncHHMM);
  prefs.putString("date", cachedDate);
  strncpy(lastSync, syncHHMM, 5);
  prefs.end();
}

// Le cache n'est valide que s'il date d'aujourd'hui
bool cache_valid(const char* todayStr) {
  prefs.begin("planning", true);
  String d = prefs.getString("date", "");
  prefs.end();
  return d == todayStr;
}

Event* cache_today()    { return evToday; }
Event* cache_tomorrow() { return evTomorrow; }
int&   cache_nToday()   { return nToday; }
int&   cache_nTomorrow(){ return nTomorrow; }
const char* cache_sync(){ return lastSync; }
