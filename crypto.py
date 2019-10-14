from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.padding import PKCS1v15
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.exceptions import InvalidSignature
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

def verify(binary, signature, pubkey_data, raise_error = True):
    try:
        pubkey = serialization.load_pem_public_key(
            pubkey_data,
            backend=default_backend()
        )

        pubkey.verify(
            signature,
            binary,
            PKCS1v15(),
            SHA256()
        ) # Raises InvalidSignature

        return True
    except InvalidSignature:
        if raise_error:
            raise
        else:
            return False
