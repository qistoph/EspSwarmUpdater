import hashlib
from functools import partial

#### MD5 of file ####

def md5sum(filename):
    with open(filename, mode='rb') as f:
        d = hashlib.md5()
        for buf in iter(partial(f.read, 128), b''):
            d.update(buf)
    return d.hexdigest()

#### HTTP AUTH ####

from flask import request

def check_auth(username, password):
    from server import config
    return username == config['auth']['username'] and password == config['auth']['password']

def check_apikey(apikey):
    from server import config
    return apikey == config['auth']['apikey']

def login_required(func):
    def wrapper(*args, **kwargs):
        auth = request.authorization
        apikey = request.headers.get('X-APIKEY')
        if not (auth and check_auth(auth.username, auth.password) or check_apikey(apikey)):
            return ('Unauthorized', 401, {
                'WWW-Authenticate': 'Basic realm="Login Required"'
                })
        return func(*args, **kwargs)
    return wrapper

