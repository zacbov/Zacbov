// render.cpp — mise en page planning 800x480 N&B
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold24pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSans12pt7b.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Preferences.h>
#include "config.h"

// 7.5" V2 800x480 — si clone UC8179, remplacer par GxEPD2_750_GDEY075T7
GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT>
  display(GxEPD2_750_T7(PIN_CS, PIN_DC, PIN_RST, PIN_BUSY));

static const char* JOURS[] = {"Dimanche","Lundi","Mardi","Mercredi",
                              "Jeudi","Vendredi","Samedi"};
static const char* MOIS[]  = {"janv.","fevr.","mars","avril","mai","juin",
                              "juil.","aout","sept.","oct.","nov.","dec."};

static int hhmmToMin(const char* s) {
  return (s[0]-'0')*600 + (s[1]-'0')*60 + (s[3]-'0')*10 + (s[4]-'0');
}

static void fitText(char* buf, const char* src, int maxPx) {
  strncpy(buf, src, 63); buf[63] = 0;
  int16_t x1, y1; uint16_t w, h;
  display.getTextBounds(buf, 0, 0, &x1, &y1, &w, &h);
  while (w > (uint16_t)maxPx && strlen(buf) > 4) {
    buf[strlen(buf)-1] = 0;
    strcpy(buf + strlen(buf) - 3, "...");
    display.getTextBounds(buf, 0, 0, &x1, &y1, &w, &h);
  }
}

int batteryPct = 100;

void render_init() {
  display.init(115200);
}

void render_planning(const Event* ev, int n, const struct tm& now,
                     const char* lastSync, bool showTomorrow, int nTomorrow) {
  Preferences p;
  p.begin("cfg", true);
  String room = p.getString("room", ROOM_NAME_DEFAULT);
  p.end();

  int nowMin = now.tm_hour * 60 + now.tm_min;

  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);

    // ===== Bandeau haut (inverse) =====
    display.fillRect(0, 0, 800, 64, GxEPD_BLACK);
    display.setTextColor(GxEPD_WHITE);
    display.setFont(&FreeSansBold24pt7b);
    display.setCursor(20, 46);
    display.print(room);

    char dateStr[40];
    snprintf(dateStr, sizeof(dateStr), "%s %d %s",
             JOURS[now.tm_wday], now.tm_mday, MOIS[now.tm_mon]);
    display.setFont(&FreeSansBold18pt7b);
    int16_t x1, y1; uint16_t w, h;
    display.getTextBounds(dateStr, 0, 0, &x1, &y1, &w, &h);
    display.setCursor(800 - 20 - w, 42);
    display.print(dateStr);
    display.setTextColor(GxEPD_BLACK);

    int yTop = 64;
    if (showTomorrow) {
      display.setFont(&FreeSans12pt7b);
      display.setCursor(20, 90);
      display.print("Planning de demain :");
      yTop = 100;
    }

    // ===== Creneaux =====
    if (n == 0) {
      display.setFont(&FreeSansBold24pt7b);
      const char* msg = "Salle libre aujourd'hui";
      display.getTextBounds(msg, 0, 0, &x1, &y1, &w, &h);
      display.setCursor((800 - w) / 2, 250);
      display.print(msg);
    } else {
      int rowH = min(52, (430 - yTop - 40) / n);
      int y = yTop + 14;

      for (int i = 0; i < n; i++) {
        bool current = !showTomorrow &&
                       nowMin >= hhmmToMin(ev[i].start) &&
                       nowMin <  hhmmToMin(ev[i].end);
        bool past    = !showTomorrow && nowMin >= hhmmToMin(ev[i].end);

        if (current) {
          display.drawRect(12, y, 776, rowH, GxEPD_BLACK);
          display.drawRect(13, y+1, 774, rowH-2, GxEPD_BLACK);
          display.drawRect(14, y+2, 772, rowH-4, GxEPD_BLACK);
        }

        int baseline = y + rowH/2 + 10;
        display.setFont(&FreeSansBold18pt7b);
        display.setCursor(28, baseline);
        char plage[16];
        snprintf(plage, sizeof(plage), "%s - %s", ev[i].start, ev[i].end);
        display.print(plage);

        display.setFont(past ? &FreeSans12pt7b : &FreeSansBold18pt7b);
        char titre[64];
        fitText(titre, ev[i].summary, current ? 380 : 480);
        display.setCursor(280, baseline);
        display.print(titre);

        if (past) {
          display.getTextBounds(titre, 280, baseline, &x1, &y1, &w, &h);
          display.drawLine(280, baseline - h/2 + 2,
                           280 + w, baseline - h/2 + 2, GxEPD_BLACK);
        }
        if (current) {
          display.setFont(&FreeSansBold18pt7b);
          display.setCursor(672, baseline);
          display.print("EN COURS");
        }
        y += rowH;
      }
    }

    // ===== Pied de page =====
    display.drawLine(0, 440, 800, 440, GxEPD_BLACK);
    display.setFont(&FreeSans9pt7b);
    display.setCursor(20, 465);
    char foot[80];
    snprintf(foot, sizeof(foot), "Synchro %s   |   demain : %d creneau%s",
             lastSync, nTomorrow, nTomorrow > 1 ? "x" : "");
    display.print(foot);

    display.drawRect(730, 452, 44, 18, GxEPD_BLACK);
    display.fillRect(774, 457, 4, 8, GxEPD_BLACK);
    display.fillRect(732, 454, (40 * batteryPct) / 100, 14, GxEPD_BLACK);

  } while (display.nextPage());

  display.hibernate();
}
