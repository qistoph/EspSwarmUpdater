# EspSwarmUpdater

Manage update for your ESP8266 swarm with ease:

1. Run **EspSwarmUpdater**
2. Include the [SwarmUpdater library](https://github.com/qistoph/EspSwarmUpdater/tree/master/libraries/SwarmUpdater/) in your ESP Arduino code
3. Open the management interface

To help prevent malicious firmware updates, I advise you to [sign your images](https://arduino-esp8266.readthedocs.io/en/latest/ota_updates/readme.html#advanced-security-signed-updates).

## TODO
- Add field explanation (see popform.templates.modal body)
- Nicer paginate tables? (inspiration: https://www.datatables.net/)
- Table sorting/filtering
- Upload firmware from WebUI (WIP)
- Move UI definition (html\_\*-fields) from DB to `ui.js`
- Use MDNSServiceQueryCallback
- Implement HTTPS
- Write build server example
- Verify signed image signature when added (requires pub-keys)
- Show image description/version instead of hash in devices and categories list
- Link image in categories list
- Add type public key and allow public key uploads (to verify sigs)
