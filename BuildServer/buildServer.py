#!/usr/bin/python3
import subprocess

paths = {}
paths["arduino-builder"] = "/home/chris/arduino-1.8.9/arduino-builder"
paths["hardware"] = ["/home/chris/arduino-1.8.9/hardware/", "/home/chris/Arduino/hardware/"]
paths["libraries"] = ["/home/chris/Arduino/libraries/"]
paths["tools"] = ["/home/chris/arduino-1.8.9/hardware/tools/", "/home/chris/arduino-1.8.9/tools-builder/"]

fqbn = "esp8266com:esp8266:d1_mini:xtal=80,vt=flash,exception=disabled,ssl=all,eesz=4M2M,ip=lm2f,dbg=Serial,lvl=HTTP_UPDATE,wipe=none,baud=921600"
logger="machine"
warnings="all"
extra="-verbose"

basecmd = [paths["arduino-builder"],
    "-logger="+logger,
    *[f"-libraries={lib}" for lib in paths["libraries"]],
    *[f"-hardware={hw}" for hw in paths["hardware"]],
    *[f"-tools={tool}" for tool in paths["tools"]],
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

print(props)

basecmd.append("-prefs=build.extra_flags=" + props["build.extra_flags"] + " -DVERSION_STRING=\"Builder-Build\"")
#basecmd.append("-prefs=runtime.tools.ctags.path=/home/chris/arduino-1.8.9/tools-builder/ctags/5.8-arduino11/")

cmd = [*basecmd, "-compile", "/home/chris/Arduino/libraries/SwarmUpdater/examples/SwarmUpdater/SwarmUpdater.ino"]
print("\n".join(cmd))
result = subprocess.run(cmd, stdout=subprocess.PIPE)
for line in result.stdout.decode('utf-8').split("\n"):
    if ".bin" in line:
        print(line)
#for line in result.stderr.decode('utf-8').split("\n"):
    #print(line)
