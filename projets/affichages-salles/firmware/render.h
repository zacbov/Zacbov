#pragma once
#include "config.h"

extern int batteryPct;

void render_init();
void render_planning(const Event* ev, int n, const struct tm& now,
                     const char* lastSync, bool showTomorrow, int nTomorrow);
