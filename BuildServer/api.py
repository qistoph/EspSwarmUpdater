import os
import requests
from base64 import b64encode

class SwarmApi:
    def __init__(self, base_url, apikey):
        self.base_url = base_url
        self.apikey = apikey

    def _post(self, suburl, json):
        headers = {
            'X-ApiKey': self.apikey
        }
        return requests.post(self.base_url + suburl, json=json, headers=headers)

    def _put(self, suburl, json):
        headers = {
            'X-ApiKey': self.apikey
        }
        return requests.put(self.base_url + suburl, json=json, headers=headers)

    def _get(self, suburl):
        headers = {
            'X-ApiKey': self.apikey
        }
        return requests.get(self.base_url + suburl, headers=headers)

    def save_image(self, filename, description, version):
        with open(filename, 'rb') as f:
            binary = b64encode(f.read())

        data = {
            "filename": os.path.basename(filename),
            "binary": binary,
            "description": description,
            "version": version
        }

        res = self._post("/images", data)
        return (res.status_code == 200), res

    def update_category(self, name, desired_image):
        res = self._get("/category/" + name)
        category = res.json()
        category['desired_image'] = desired_image
        res = self._put("/category/" + name, category)
        return (res.status_code == 200), res
