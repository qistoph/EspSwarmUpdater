#include <SwarmUpdater.h>

#define WIFI_SSID "YourSSID"
#define WIFI_PASS "YourPassword"

#define SEC_TO_USEC (1000*1000)
#define MIN_TO_USEC (60ULL*SEC_TO_USEC)

void toggleLed() {
  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
}

void setup() {
  Serial.begin(115200);
  Serial.println("SwarmUpdater example starting...");
  pinMode(LED_BUILTIN, OUTPUT);

  Serial.println("Connecting wifi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  // Wait for connection
  unsigned long timeout = millis() + 10000;
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    toggleLed();
    Serial.print(".");
    if(millis() > timeout) {
      break;
    }
  }

  if(WiFi.status() != WL_CONNECTED) {
    Serial.println("\nNo wifi connection. Sleep.");
    ESP.deepSleep(1*MIN_TO_USEC);
    // ESP resets after sleep and starts at setup() again
    Serial.println("This should never be printed.");
  }

  Serial.println("\nWifi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  digitalWrite(LED_BUILTIN, LOW);

  // Check for updates at boot
  SwarmUpdater.update("SwarmUpdaterExample");
}

unsigned long nextSwarmUpdate = 0;

void loop() {
  Serial.println("Your looped stuff");

  // Check for updates periodically
  if(millis() > nextSwarmUpdate) {
    nextSwarmUpdate = millis() + 60*MIN_TO_USEC;
    SwarmUpdater.update("SwarmUpdaterExample");
  }
}
