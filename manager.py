from hashlib import md5 as _md5
import time
import struct
from functools import reduce

import swarmdb as DB
import crypto

#DB.load("swarmdb.json")
#print(DB.data)

def is_known_mac(mac):
    return any(DB.Device.get(mac))

def get_desired_image(mac):
    device = DB.Device.get(mac)
    if not device:
        raise ValueError(f"No device with MAC {mac}")
        
    print(device)
    if device and device["desired_image"] is not None:
        return {"md5": device["desired_image"], "source": "device"}
    elif "category" in device:
        category = DB.Category.get(device["category"])
        if category and "desired_image" in category:
            return {"md5": category["desired_image"], "source": "category"}

    return {"md5": None, "source": "device"}

def update_device_seen(mac, version, md5):
    if DB.Image.count({"md5": md5}) == 0:
        DB.Image.new(md5, version = version, last_seen=time.time()).save()
    else:
        img = DB.Image.get(md5)
        img.last_seen = time.time()
        img.save()

    device = DB.Device.get(mac)
    if device is None:
        DB.Device.new(mac, None, time.time(), time.time(), version, md5).save()
    else:
        device.current_image = md5
        device.current_version = version
        device.last_seen = time.time()
        device.save()

def is_image_signed(blob):
    # Signed update ends with bytes (hex): 00 01 00 00
    return blob[-4:] == b'\x00\x01\x00\x00'

def verify_signature(signed_binary_data, pubkey_data):
    (sig_len,) = struct.unpack("<I", signed_binary_data[-4:])
    sig_start = len(signed_binary_data) - 4 - sig_len
    signature = signed_binary_data[sig_start:-4]
    binary = signed_binary_data[0:sig_start]
    return crypto.verify(binary, signature, pubkey_data, False)

def get_image_md5(blob):
    if is_image_signed(blob):
        return _md5(blob[0:-0x104]).hexdigest()
    else:
        return _md5(blob).hexdigest()

def get_image_data(md5):
    image = DB.Image.get(md5)
    assert image is not None, f"No image with MD5 {md5}"

    version = image["version"]
    filename = image["filename"]

    with open(f"./bin/{filename}", "rb") as f:
        data = f.read()

    md5sum = get_image_md5(data)
    assert md5 == md5sum, f"{md5} == {md5sum}"
    return version, filename, md5sum, data

def search_paginated(cls, offset, limit, search):
    if len(search) <= 0:
        return cls.search()[offset:offset+limit]
    else:
        return cls.search(search)[offset:offset+limit]

def update_device(mac, data):
    ans = table_devices.update(data, where("mac") == mac)
    return ans

def get_devices(offset = 0, limit = 10, search = {}):
    devs = search_paginated(DB.Device, offset, limit, search)
    for dev in devs:
        dev["desired_image"] = get_desired_image(dev["mac"])
    return devs

def update_image(md5, data):
    ans = table_images.update(data, where("md5") == md5)
    return ans

def get_images(offset = 0, limit = 10, search = {}):
    return search_paginated(DB.Image, offset, limit, search)

def update_category(name, data):
    ans = table_categories.update(data, where("name") == name)
    return ans

def get_categories(offset = 0, limit = 10, search = {}):
    cats = search_paginated(DB.Category, offset, limit, search)
    for cat in cats:
        cat["num_devices"] = DB.Device.count({"category": cat["name"]})
    return cats

def get_pubkeys(offset = 0, limit = 10, search = {}):
    keys = search_paginated(DB.PubKey, offset, limit, search)
    for key in keys:
        del key["data"]
    print(keys)
    return keys

if __name__ == '__main__':
    DB.Category.new("sensors").save()
    DB.Device.new("38:af:d7:a9:e2:1a", "localhost", time.time(), time.time(), None, None, "fa3722683f154dc281ff9c7d5a765830", "sensors").save()
    DB.Device.new("f6:c4:87:f4:d1:1e", "test", time.time(), time.time()).save()

    DB.Image.new("fa3722683f154dc281ff9c7d5a765830").save()

    print(is_known_mac("f6:c4:87:f4:d1:1e"))
    print("---")
    print(DB.data)

    #print(db)
    #register_device('12:34:56:78:90', 'Blaat-1.0', 'ASDFASDFASDF')
    #update_last_seen('12:34:56:78:90')

    image_md5 = get_desired_image('38:af:d7:a9:e2:1a')["md5"]
    print("image_md5", image_md5)
    print(image_md5)
    print(DB.Image.get(image_md5))
    print(get_devices(search={"category":"sensors"}))
    print(DB.Device.get("38:af:d7:a9:e2:1a"))
    print(DB.Device.delete_("38:af:d7:a9:e2:1a"))
    print(DB.data)
    DB.Device.new("f6:c4:87:f4:d1:1e", "test", time.time(), time.time()).save()
