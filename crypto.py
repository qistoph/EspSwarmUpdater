from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.padding import PKCS1v15
from cryptography.hazmat.primitives.hashes import SHA256
import struct
import sys
import logging

logger = logging.getLogger(__name__)

def is_pubkey(data):
    try:
        ret = serialization.load_pem_public_key(
            data,
            backend=default_backend()
        )
        return True
    except ValueError:
        return False
