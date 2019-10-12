# EspSwarmUpdater

This library makes it really easy to keep your ESP8266 modules up to date. The accompanying update server can be found at https://github.com/qistoph/EspSwarmUpdater.

## Installation
The [EspSwarmUpdater server](https://github.com/qistoph/EspSwarmUpdater) contains a copy of this library. You can copy or link the folder `SwarmUpdater` in the `libraries` folder to your Arduino libraries folder.

```
$ cp -r ~/Projects/EspSwarmUpdater/libraries/SwarmUpdater/ ~/Arduino/libraries/

# OR

$ ln -s ~/Projects/EspSwarmUpdater/libraries/SwarmUpdater/ ~/Arduino/libraries/
```

Restart your Arduino IDE.

## Usage
```c++
#include <SwarmUpdater.h>

SwarmUpdater.update(VERSION_STRING);
```

An example implementation is availble under `examples`.
