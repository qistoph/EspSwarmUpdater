import sys
import json
from flask import Blueprint, request, make_response, send_file, redirect, url_for, jsonify
from flask_restful import Api, Resource, abort
from io import BytesIO
from base64 import b64decode

import manager
import swarmdb as DB

if sys.version_info[0] != 3 or sys.version_info[1] < 6:
    print("This script requires Python version 3.6")
    print("Because of PEP 520 - https://www.python.org/dev/peps/pep-0520/")
    sys.exit(1)

blueprint = Blueprint('api', __name__)
api = Api(blueprint)

@blueprint.route("/")
def index():
    return 'API index'

def getProps(cls):
    attrs = map(lambda name:getattr(cls, name), cls.__dict__)
    for attr in filter(lambda f: isinstance(f, DB.Prop), attrs):
        yield attr

@blueprint.route("/types")
def types():
    ret = {}
    for typ in [DB.Device, DB.Category, DB.Image]:
        definition = []
        for prop in getProps(typ):
            print(dir(prop))
            definition.append({
                "name": prop.name,
                "pattern": prop.html_pattern,
                "required": bool(prop.flags & DB.Prop.flags.REQUIRED),
                "flags": prop.flags,
                "input": {"type": prop.html_type, "attrs": prop.html_attrs},
            })
        ret[typ.table] = {"name": typ.table, "key": typ.key, "props": definition}
    return jsonify(ret)

def paginate(count = None, max_limit = 20): # Factory
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Default values
            offset = 0
            limit = 10

            if 'X-Paginate' in request.headers:
                paginate = json.loads(request.headers.get('X-Paginate'))
                offset = paginate.get('offset', offset)
                limit = paginate.get('limit', limit)

            if limit > max_limit:
                return abort(400, message=f"Max limit is {max_limit}")

            kwargs['offset'] = offset
            kwargs['limit'] = limit
            ans = func(*args, **kwargs)

            # enforce limit, in case func forgot
            ans = ans[0:limit]

            headers = {'X-Paginate': json.dumps({
                'offset': offset,
                'limit': limit,
                'total': count(args[0])
            })}
            return (ans,None,headers)
        return wrapper
    return decorator

class Device(Resource):
    def get(self, mac):
        return DB.Device.get(mac)

    def put(self, mac):
        #TODO input sanitation
        d = DB.Device.get(mac)
        d.update(**request.json)
        d.save()
        new_mac = request.json["mac"]
        return self.get(new_mac)

    def delete(self, mac): #TODO input sanitation
        obj = DB.Device.get(mac)
        if obj is None:
            return abort(404)
        obj.delete()

class Category(Resource):
    def get(self, name):
        return DB.Category.get(name)

    def put(self, name):
        #TODO input sanitation
        c = DB.Category.get(name)
        c.update(**request.json)
        c.save()
        new_name = request.json["name"]
        return self.get(new_name)

    def delete(self, name):
        #TODO input sanitation
        obj = DB.Category.get(name)
        if obj is None:
            return abort(404)
        obj.delete()

class Image(Resource):
    def get(self, md5):
        return DB.Image.get(md5)

    def put(self, md5):
        #TODO input sanitation
        i = DB.Image.get(md5)
        i.update(**request.json)
        i.save()
        new_md5 = request.json["md5"]
        return self.get(new_md5)

    def delete(self, md5):
        #TODO input sanitation
        obj = DB.Image.get(md5)
        if obj is None:
            return abort(404)
        obj.delete()

class DeviceList(Resource):
    def count(self):
        return DB.Device.count()

    @paginate(count)
    def get(self, offset, limit):
        #print(f"Get device list offset: {offset}, limit: {limit}")
        #print(request.args)
        return manager.get_devices(offset, limit, request.args.to_dict())

    def post(self):
        #TODO input sanitation
        DB.Device.new(**request.json).save()
        return redirect(url_for("api.device", mac=request.json["mac"]))

class ImageList(Resource):
    def count(self):
        return DB.Image.count()

    @paginate(count)
    def get(self, offset, limit):
        return manager.get_images(offset, limit, request.args.to_dict())

    def post(self):
        from werkzeug.utils import secure_filename
        import os.path

        #TODO input sanitation

        data = request.json
        binary = b64decode(data["binary"])
        del data["binary"]
        data["md5"] = manager.get_image_md5(binary)

        dest_filename = os.path.join("bin", secure_filename(data["filename"]))
        if os.path.isfile(dest_filename):
            raise ValueError("Filename already in use")

        with open(dest_filename, "wb") as f:
            f.write(binary)

        DB.Image.new(**data).save()
        return redirect(url_for("api.image", md5=request.json["md5"]))

class CategoryList(Resource):
    def count(self):
        return DB.Category.count()

    @paginate(count)
    def get(self, offset, limit):
        return manager.get_categories(offset, limit, request.args.to_dict())

    def post(self):
        #TODO input sanitation
        DB.Category.new(**request.json).save()
        return redirect(url_for("api.category", name=request.json["name"]))

class ImageBinary(Resource):
    def get(self, md5):
        (file_version, file_name, file_md5, file_data) = manager.get_image_data(md5)
        response = make_response(send_file(BytesIO(file_data), as_attachment=True, attachment_filename=file_name))
        response.headers['X-MD5'] = file_md5
        response.headers['Content-Length'] = len(file_data)
        return response

api.add_resource(Device, '/device/<string:mac>')
api.add_resource(Image, '/image/<string:md5>')
api.add_resource(ImageBinary, '/image/<string:md5>/binary')
api.add_resource(Category, '/category/<string:name>')
api.add_resource(DeviceList, '/devices')
api.add_resource(ImageList, '/images')
api.add_resource(CategoryList, '/categories')
