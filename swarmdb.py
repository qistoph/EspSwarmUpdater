import re
import copy
import json
import shelve
from flask import g
import sqlite3
import logging

DATABASE = "swarmdb.db"

logger = logging.getLogger(__name__)

def init_db(app):
    db = get_db()
    with app.open_resource('schema.sql', mode='r') as f:
        db.cursor().executescript(f.read())
    db.commit()

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE, timeout=5)
    return db

def query_db(query, args=(), one=False):
    #import traceback
    #traceback.print_stack()
    logger.debug(f"Query DB: {query} with {args}")
    con = get_db()
    con.row_factory = dict_factory
    cur = con.execute(query, args)
    rv = cur.fetchall()
    con.commit()
    cur.close()
    return (rv[0] if rv else None) if one else rv

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

class _DBType(dict):
    @classmethod
    def search(cls, matcher = None, order_fields = []):
        table_name = cls.table
        ret = []

        where = ""
        where_vals = []
        if matcher is not None:
            for key, value in matcher.items():
                if where != "":
                    where += " AND "
                where += f"{key} = ?"
                where_vals.append(value)

            if where != "":
                where = "WHERE "+where

        orderby = ""
        if len(order_fields) > 0:
            props = list(filter(lambda p: isinstance(getattr(cls, p), Prop), dir(cls)))
            def orderStr(name, direction):
                if name not in props:
                    raise ValueError(f"Cannot sort by {name}, need {props}")
                return f"{name} {direction}"

            orderby = "ORDER BY " + ", ".join([orderStr(*a) for a in order_fields])

        query = f"SELECT * FROM {table_name} {where} {orderby}"
        for row in query_db(query, where_vals):
            obj = cls.new(**row)
            obj._dbid = getattr(obj, cls.key) # So we know to UPDATE instead of INSERT
            ret.append(obj)
        return ret

    @classmethod
    def count(cls, matcher = None):
        return len(cls.search(matcher))

    @classmethod
    def get(cls, matcher = None):
        if type(matcher) is dict:
            return next(iter(cls.search(matcher)), None)
        else:
            #TODO is explicit dict() here really necessary?
            return cls.get(dict({cls.key: matcher}))

    @classmethod
    def delete_(cls, matcher):
        obj = cls.get(matcher)
        if obj is not None:
            obj.delete()

    def __init__(self, doc = {}):
        super().__init__(doc)
        self._dbid = None # Will be set after INSERT / SELECT

    def _get_props(self):
        ret = {}
        for name in dir(self.__class__):
            attr = getattr(self.__class__, name)
            if isinstance(attr, Prop):
                ret[attr.name] = getattr(self, name)
        return ret

    def save(self):
        table_name = type(self).table
        key_name = type(self).key
        props = self._get_props()

        if self._dbid is None:
            query = f'''
            INSERT INTO {table_name} ({", ".join(props.keys())})
            VALUES (?{", ?"*(len(props)-1)})
            '''
            res = query_db(query, list(props.values()))
            self._dbid = getattr(self, key_name)
        else:
            query = f"UPDATE {table_name} SET " + (", ".join([f"{key} = ?" for key in props.keys()])) + \
                    f" WHERE {key_name} = ?"
            res = query_db(query, list(props.values())+[self._dbid])
            self._dbid = getattr(self, key_name)

    def delete(self):
        table_name = type(self).table
        key = type(self).key
        value = getattr(self, key)
        query = f'DELETE FROM {table_name} WHERE {key} = ?'
        query_db(query, [value])
        #TODO: count affected columns
        return True

    def update(self, **values):
        for key, val in values.items():
            if hasattr(self, key):
                if getattr(self.__class__, key).flags & Prop.flags.NO_EDIT:
                    raise ValueError(f"Edit not allowed on {self.__class__.__name__}.{key}")
                setattr(self, key, val)

retype = type(re.compile("Hello, world!"))
class Prop():
    __indexCounter = 0

    from enum import IntFlag
    class flags(IntFlag):
        REQUIRED = 1,
        NO_SET = 2,
        NO_EDIT = 4,
        READ_ONLY = 6,
        NEW_ONLY = 4,
        EDIT_ONLY = 2

    def __init__(self, name, data_type, validator = None, flags = 0, html_pattern = None, html_type = None, html_attrs = None):
        # To keep order of props
        self.__index = Prop.__indexCounter
        Prop.__indexCounter+=1

        self.name = name # Field name in DB
        self.validator = validator
        self.flags = flags

        self.allow_none = True
        if self.flags & Prop.flags.REQUIRED:
            self.allow_none = False

        self.html_attrs = html_attrs
        if self.html_attrs is None:
            self.html_attrs = {}

        if html_type is None:
            if data_type is str:
                self.html_type = "text"
            elif data_type is bool:
                self.html_type = "checkbox"
            elif data_type is int:
                self.html_type = "number"
            elif data_type is float:
                self.html_type = "number"
                self.html_attrs["step"] = "0.1"
            else:
                self.html_type = "text"
        else:
            self.html_type = html_type

        if isinstance(validator, str) and html_pattern is None:
            self.html_pattern = validator
        else:
            self.html_pattern = html_pattern

    def validate(self, value):
        #print("Prop.validate:", type(self.validator))
        if self.validator is None:
            return value
        elif value is None:
            if self.allow_none:
                return None
            else:
                raise ValueError(f"{self.name} must be set and cannot be None")
        elif type(self.validator) == str:
            if not re.match(self.validator, value):
                raise ValueError(f"\"{value}\" is not a valid value for {self.name}.")
            return value
        elif type(self.validator) == retype:
            if not self.validator.match(value):
                raise ValueError(f"\"{value}\" is not a valid value for {self.name}.")
            return value
        elif callable(self.validator):
            ret = self.validator(value)
            return ret
        else:
            raise NotImplementedError(f"Prop validation with {type(self.validator)}")

    def __get__(self, instance, cls):
        if instance is None:
            return self
        return instance[self.name]

    def __set__(self, instance, value):
        #TODO: maybe check if NEW_ONLY/EDIT_ONLY/READ_ONLY is set
        #For now they're only used in the front-end
        instance[self.name] = self.validate(value)

class Device(_DBType):
    table = "device"
    key = "mac"

    mac = Prop("mac", str, "^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}$", Prop.flags.REQUIRED|Prop.flags.NEW_ONLY)
    description = Prop("description", str)
    first_seen = Prop("first_seen", float, html_type="datetime")
    last_seen = Prop("last_seen", float, html_type="datetime")
    current_version = Prop("current_version", str)
    current_image = Prop("current_image", str, "^[0-9a-fA-F]{32}$", html_type="ref_image")
    desired_image = Prop("desired_image", str, "^[0-9a-fA-F]{32}$", html_type="ref_image")
    category = Prop("category", str, "^[a-zA-Z]\w+$", html_type="ref_category")

    @classmethod
    def new(cls, mac, description = None, first_seen = None, last_seen = None, current_version = None, current_image = None, desired_image = None, category = None):
        d = Device()
        d.mac = mac
        d.description = description
        d.first_seen = first_seen
        d.last_seen = last_seen
        d.current_version = current_version
        d.current_image = current_image
        d.desired_image = desired_image
        d.category = category
        return d

class Category(_DBType):
    table = "category"
    key = "name"

    name = Prop("name", str, "^[a-zA-Z]\w+$", flags=Prop.flags.REQUIRED)
    desired_image = Prop("desired_image", str, "^[0-9a-f]{32}$", html_type="ref_image")

    @classmethod
    def new(cls, name, desired_image = None):
        c = Category()
        c.name = name
        c.desired_image = desired_image
        return c

class Image(_DBType):
    table = "image"
    key = "md5"

    md5 = Prop("md5", str, "^[0-9a-f]{32}$", flags=Prop.flags.READ_ONLY)
    description = Prop("description", str)
    version = Prop("version", str)
    filename = Prop("filename", str, flags=Prop.flags.READ_ONLY)
    signed = Prop("signed", bool, flags=Prop.flags.READ_ONLY) # TODO: not just yes/no but split yes into valid/invalid
    pubkey = Prop("pubkey", str, "^\w+$", flags=Prop.flags.READ_ONLY)
    added = Prop("added", float, html_type="datetime", flags=Prop.flags.READ_ONLY)
    last_seen = Prop("last_seen", float, html_type="datetime", flags=Prop.flags.READ_ONLY)

    @classmethod
    def new(cls, md5, description = None, version = None, filename = None, signed = None, pubkey = None, added = None, last_seen = None):
        #TODO: maybe find a way to not have write out all props here
        i = Image()
        i.md5 = md5
        i.description = description
        i.version = version
        i.filename = filename
        i.signed = signed
        i.pubkey = pubkey
        i.added = added
        i.last_seen = last_seen
        return i

class PubKey(_DBType):
    table = "pubkey"
    key = "description"

    description = Prop("description", "^\w+$", flags=Prop.flags.REQUIRED)
    added = Prop("added", float, html_type="datetime", flags=Prop.flags.READ_ONLY)
    data = Prop("data", str, flags=Prop.flags.READ_ONLY)

    @classmethod
    def new(cls, description, added = None, data = None):
        p = PubKey()
        p.description = description
        p.added = added
        p.data = data
        return p
