# EspSwarmUpdater

Manage updates for your ESP8266 swarm with ease:

1. Run **EspSwarmUpdater**
  - `git clone https://github.com/qistoph/EspSwarmUpdater`
  - `cd EspSwarmUpdater`
  - Edit server.py and change the values in config:
    - `auth.username` and `auth.password` are used to login to the management interface
	- `mdns.ip` must be the IP your ESPs can reach the host at
- `./server.py`
2. Include the [SwarmUpdater library](https://github.com/qistoph/EspSwarmUpdater/tree/master/libraries/SwarmUpdater/) in your ESP Arduino code
3. Open the management interface
  - http://localhost:5000/

To help prevent malicious firmware updates, I advise you to [sign your images](https://arduino-esp8266.readthedocs.io/en/latest/ota_updates/readme.html#advanced-security-signed-updates).

![Screenshot](https://raw.githubusercontent.com/qistoph/EspSwarmUpdater/screenshots/screenshots/screenshot1.png)

## TODO
- Add field explanation (see popform.templates.modal body)
- Nicer paginate tables? (inspiration: https://www.datatables.net/)
- Table sorting/filtering
- Move UI definition (html\_\*-fields) from DB to `ui.js`
- Use MDNSServiceQueryCallback
- Implement HTTPS
- Write build server example (WIP)
- Verify signed image signature when added (manager.verify\_signature)
- Show image description/version instead of hash in devices and categories list
- Link image in categories list
- Proper error messages to client on save/delete (WIP)
- Track failed updates and mark device red after 3 attempts
