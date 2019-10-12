import logging
import socket

from zeroconf import ServiceInfo, Zeroconf
from netifaces import interfaces, ifaddresses, AF_INET, AF_INET6

zeroconf = None
info = None

logger = logging.getLogger(__name__)

def addresses(ip_types = [AF_INET]):
    ip_list = []
    for interface in interfaces():
        for (proto, links) in ifaddresses(interface).items():
            if proto in ip_types:
                for link in links:
                    ip_list.append(link['addr'])
    return ip_list

def register_service(port, ssl=False, debug=False):
    global zeroconf, info

    if debug:
        logging.getLogger("zeroconf").setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)

    desc = {"path": "/check"}

    typ = "_espupdater-http._tcp.local."

    if ssl:
        typ = "_espupdater-https._tcp.local."

    #TODO: all_ips = addresses()
    #TODO: match against config["host"]
    all_ips = ['192.168.178.108']
    logger.info(f"IPs: {all_ips}")

    info = ServiceInfo(
        typ,
        "ESP Swarm Updater." + typ,
        addresses=[socket.inet_aton(ip) for ip in all_ips],
        port=port,
        properties=desc,
        server="ash-2.local.",
    )

    zeroconf = Zeroconf()
    logger.info("Registration of mDNS service")
    zeroconf.register_service(info)

def unregister_service():
    logger.info("Unregistering mDNS...")
    zeroconf.unregister_service(info)
    zeroconf.close()
