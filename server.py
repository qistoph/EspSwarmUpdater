#!/usr/bin/env python3

import time
import logging
import socket
from time import sleep
from hashlib import md5
from flask import Flask, request, redirect, url_for, abort, send_file, make_response, render_template, g
from io import BytesIO

import MdnsAnnounce
import manager
from tools import md5sum
import swarmapi
import swarmdb

logger = logging.getLogger("server")
app = Flask(__name__)

config = {
    "host": '0.0.0.0',
    "port": 5000,
    "loglevel": logging.DEBUG,
    "locale": "en_US",
    "debug": True,
    "mdns": {
        "debug": False
    }
}

def check_esp_headers(func):
    def func_wrapper(*args, **pwargs):
        required_headers = ['X-ESP8266-STA-MAC','X-ESP8266-AP-MAC','X-ESP8266-FREE-SPACE','X-ESP8266-SKETCH-SIZE','X-ESP8266-SKETCH-MD5','X-ESP8266-CHIP-SIZE','X-ESP8266-SDK-VERSION']

        if request.headers.get('User-Agent') != 'ESP8266-http-Update':
            logger.warning("Invalid User-Agent:", request.headers.get('User-Agent'))
            return abort(403)

        for header in required_headers:
            if request.headers.get(header) is None:
                logger.warning(f"Missing header {header}")
                return abort(403)

        return func(*args, **pwargs)
    return func_wrapper

@app.route("/")
def index():
    kwargs={}
    kwargs["devices"] = manager.get_devices()
    kwargs["images"] = manager.get_images()
    kwargs["categories"] = manager.get_categories()
    return render_template("index.html", **kwargs)

@app.route("/check")
@check_esp_headers
def check():
    logger.debug(request.headers)
    mac = request.headers.get('X-ESP8266-STA-MAC')
    current_version = request.headers.get('X-ESP8266-VERSION')
    sketch_md5 = request.headers.get('X-ESP8266-SKETCH-MD5')

    manager.update_device_seen(mac, current_version, sketch_md5)

    desired_image = manager.get_desired_image(mac)["md5"]
    if desired_image is None:
        return "ESP MAC not configured for updates", 409

    (file_version, file_name, file_md5, file_data) = manager.get_image_data(desired_image)

    force_update = False
    if force_update or \
        sketch_md5 != file_md5 or \
        (sketch_md5 is None and current_version is not None and current_version != file_version):
            return swarmapi.ImageBinary.get(None, desired_image)

    return "", 304

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=config["loglevel"])
    MdnsAnnounce.register_service(port=config["port"], debug=False)

    with app.app_context():
        swarmdb.init_db(app)

    try:
        app.config['TEMPLATES_AUTO_RELOAD'] = config["debug"]
        app.register_blueprint(swarmapi.blueprint, url_prefix="/api")
        app.run(debug=config["debug"], host=config["host"], port=config["port"])
    except KeyboardInterrupt:
        pass
    finally:
        MdnsAnnounce.unregister_service()
