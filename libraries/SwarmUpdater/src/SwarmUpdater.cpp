#include "SwarmUpdater.h"

SwarmUpdaterClass::SwarmUpdaterClass() {
  
}

void SwarmUpdaterClass::update(String version_string, bool ssl) {
  #ifdef VERSION_STRING
  version_string = VERSION_STRING;
  #endif

  Serial.print("SwarmUpdater.update(version_string=");
  Serial.print(version_string);
  Serial.print(", ssl=");
  Serial.print(ssl);
  Serial.println(")");
  
  WiFiClient client;
  
  MDNS.begin("swarm");
  int n = MDNS.queryService("espupdater-http", "tcp", 2500);
  Serial.println("mDNS query done");
  if (n == 0) {
    Serial.println("no services found");
  } else {
    Serial.print(n);
    Serial.println(" service(s) found");
    for (int i = 0; i < n; ++i) {
      // Print details for each service found
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(MDNS.serviceDomain(i));
      Serial.print(" - ");
      Serial.print(MDNS.hostname(i));
      Serial.print(" (");
      Serial.print(MDNS.IP(i));
      Serial.print(":");
      Serial.print(MDNS.port(i));
      Serial.println(")");

      Serial.print("Try: http://");
      Serial.print(MDNS.IP(i).toString());
      Serial.print(":");
      Serial.print(MDNS.port(i));
      Serial.println("/check");
      
      HTTPUpdateResult res = ESPhttpUpdate.update(client, MDNS.IP(i).toString(), MDNS.port(i), "/check", version_string);
      Serial.print("res:");
      Serial.println(res);
      switch(res) {
          case HTTP_UPDATE_FAILED:
              Serial.println("[update] Update failed.");
              break;
          case HTTP_UPDATE_NO_UPDATES:
              Serial.println("[update] Update no Update.");
              break;
          case HTTP_UPDATE_OK:
              Serial.println("[update] Update ok."); // may not be called since we reboot the ESP
              break;
      }
    }
  }
  Serial.println();
}

SwarmUpdaterClass SwarmUpdater;
