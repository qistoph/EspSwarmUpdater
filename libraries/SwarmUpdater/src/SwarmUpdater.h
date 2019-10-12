#ifndef __SWARM_UPDATER_H
#define __SWARM_UPDATER_H

#include <ESP8266httpUpdate.h>
#include <ESP8266mDNS.h>

class SwarmUpdaterClass {
  public:
    SwarmUpdaterClass();
    void update(String version_string, bool ssl=false);

  private:
};

extern SwarmUpdaterClass SwarmUpdater;

#endif
