#pragma once
#include "config.h"

void cache_load();
void cache_save(const char* syncHHMM);
bool cache_valid(const char* todayStr);
void cache_setDateStamp(const char* d);
const char* cache_dateStamp();

Event* cache_today();
Event* cache_tomorrow();
int&   cache_nToday();
int&   cache_nTomorrow();
const char* cache_sync();
