#pragma once

// ===== Identité du boîtier (valeurs par défaut, écrasées par NVS) =====
#define ROOM_NAME_DEFAULT   "SALLE VAUQUELIN"
#define ADE_RESOURCE_DEFAULT 1277

// ===== Réseau =====
#define ADE_HOST  "adeconsult.app.u-pariscite.fr"
#define ADE_PATH_FMT "/jsp/custom/modules/plannings/anonymous_cal.jsp" \
                     "?resources=%d&projectId=2&calType=ical&nbWeeks=1"

// ===== Horaires =====
#define SYNC_HOUR_1   6    // 6h00  — planning du jour
#define SYNC_HOUR_2   12   // 12h30 — rattrapage
#define SYNC_MIN_2    30
#define TOMORROW_HOUR 18   // bascule affichage "demain"

// ===== Broches (FireBeetle 2 ESP32-E) =====
#define PIN_CS    5
#define PIN_DC    17
#define PIN_RST   16
#define PIN_BUSY  4
#define PIN_EPD_PWR 25     // MOSFET P alim écran (LOW = ON)
#define PIN_BTN   27       // bouton config (vers GND, pullup interne)
#define PIN_VBAT  34

#define MAX_EVENTS 12
struct Event { char start[6]; char end[6]; char summary[64]; };
