#!/usr/bin/python3
import os
import hashlib
import subprocess

from api import SwarmApi

paths = {}
paths["arduino-builder"] = "/home/chris/arduino-1.8.9/arduino-builder"
paths["hardware"] = ["/home/chris/arduino-1.8.9/hardware/", "/home/chris/Arduino/hardware/"]
paths["libraries"] = ["/home/chris/Arduino/libraries/"]
paths["tools"] = ["/home/chris/arduino-1.8.9/hardware/tools/", "/home/chris/arduino-1.8.9/tools-builder/"]
paths["build-path"] = f"/tmp/arduino_build_swarmupdater"
paths["sketch"] = "/home/chris/Arduino/libraries/SwarmUpdater/examples/SwarmUpdater/SwarmUpdater.ino"

fqbn = "esp8266com:esp8266:d1_mini:xtal=80,vt=flash,exception=disabled,ssl=all,eesz=4M2M,ip=lm2f,dbg=Serial,lvl=HTTP_UPDATE,wipe=none,baud=921600"
logger="machine"
warnings="all"
extra="-verbose"
version_string = "SwarmUpdater-BS-1"
category = "Category1a"

api = SwarmApi("http://127.0.0.1:5000/api", "V293LCB5b3UgaGFja2VyISBMT0wgOkQ=")

sketch_basename = os.path.basename(paths["sketch"])

if not os.path.exists(paths["build-path"]):
    os.mkdir(paths["build-path"])

basecmd = [paths["arduino-builder"],
    "-logger="+logger,
    *[f"-libraries={lib}" for lib in paths["libraries"]],
    *[f"-hardware={hw}" for hw in paths["hardware"]],
    *[f"-tools={tool}" for tool in paths["tools"]],
    "-build-path="+paths["build-path"],
    "-fqbn="+fqbn,
    "-warnings="+warnings,
    extra
    ]

result = subprocess.run([*basecmd, "-dump-prefs"], stdout=subprocess.PIPE)
props = {}
for line in result.stdout.decode('utf-8').split("\n"):
    if line.startswith("[info]"):
        continue
    if line == "":
        continue
    (key, value) = line.split('=', 1)
    props[key] = value

#print(props)

basecmd.append("-prefs=build.extra_flags=" + props["build.extra_flags"] + f" -DVERSION_STRING=\"{version_string}\"")
#basecmd.append("-prefs=runtime.tools.ctags.path=/home/chris/arduino-1.8.9/tools-builder/ctags/5.8-arduino11/")

cmd = [*basecmd, "-compile", paths["sketch"]]
result = subprocess.run(cmd, stdout=subprocess.PIPE)
if result.returncode == 0:

    signed_bin = os.path.join(paths["build-path"], sketch_basename+".bin.signed")
    regular_bin = os.path.join(paths["build-path"], sketch_basename+".bin")

    if os.path.isfile(signed_bin):
        print("Use signed bin")
        upload_bin = signed_bin
    else:
        upload_bin = regular_bin

    (success, res) = api.save_image(upload_bin, version_string, version_string)
    if success:
        data = res.json()
        print("Upload done, MD5:", data['md5'])
        api.update_category(category, data['md5'])
    else:
        print("Upload failed")
        import pdb
        pdb.set_trace()
        print(res.text)
else:
    print("Failed:")
    print(result.stdout)
