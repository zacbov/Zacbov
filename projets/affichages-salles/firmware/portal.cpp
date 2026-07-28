#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include "config.h"

static WebServer srv(80);
static Preferences p;

static const char FORM[] PROGMEM = R"html(
<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Config planning</title>
<style>body{font-family:sans-serif;max-width:26em;margin:2em auto;padding:0 1em}
input{width:100%%;padding:.5em;margin:.3em 0 1em;box-sizing:border-box}
button{padding:.7em 2em;font-size:1em}</style></head><body>
<h2>Boitier planning - configuration</h2>
<form method="POST" action="/save">
SSID<input name="ssid" value="%s">
Identifiant (EAP)<input name="user" value="%s">
Ticket / mot de passe<input name="pass" type="password">
Nom affiche de la salle<input name="room" value="%s">
ID ressource ADE<input name="res" type="number" value="%d">
<button>Enregistrer et tester</button></form>
<p>%s</p></body></html>)html";

static char status[128] = "";

static void handleRoot() {
  p.begin("cfg", true);
  char buf[2048];
  snprintf(buf, sizeof(buf), FORM,
    p.getString("ssid", "").c_str(),
    p.getString("user", "").c_str(),
    p.getString("room", ROOM_NAME_DEFAULT).c_str(),
    p.getInt("res", ADE_RESOURCE_DEFAULT),
    status);
  p.end();
  srv.send(200, "text/html", buf);
}

static void handleSave() {
  p.begin("cfg", false);
  p.putString("ssid", srv.arg("ssid"));
  p.putString("user", srv.arg("user"));
  if (srv.arg("pass").length()) p.putString("pass", srv.arg("pass"));
  p.putString("room", srv.arg("room"));
  p.putInt("res", srv.arg("res").toInt());
  p.end();

  // Test immediat : connexion + fetch, resultat affiche sur la page
  extern bool net_connect(); extern void net_off();
  extern bool ical_testFetch();
  if (net_connect()) {
    strcpy(status, ical_testFetch()
      ? "<b style='color:green'>OK - WiFi + ADE valides</b>"
      : "<b style='color:orange'>WiFi OK mais fetch ADE en echec</b>");
    net_off();
  } else {
    strcpy(status, "<b style='color:red'>Echec connexion WiFi</b>");
  }
  WiFi.mode(WIFI_AP);            // on remonte l'AP pour reafficher
  handleRoot();
}

void portal_run() {
  p.begin("cfg", true);
  String ap = "PLANNING-" + String(p.getInt("res", ADE_RESOURCE_DEFAULT));
  p.end();

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap.c_str(), "pharmacie");        // mdp AP simple, reseau ephemere
  srv.on("/", handleRoot);
  srv.on("/save", HTTP_POST, handleSave);
  srv.begin();

  uint32_t t0 = millis();
  while (millis() - t0 < 5 * 60 * 1000UL) {    // 5 min puis retour au sommeil
    srv.handleClient();
    delay(5);
  }
}
