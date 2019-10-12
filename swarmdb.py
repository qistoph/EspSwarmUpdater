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
        db = g._database = sqlite3.connect(DATABASE)
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
    def search(cls, matcher = None):
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

        query = f"SELECT * FROM {table_name} {where}"
        for row in query_db(query, where_vals):
            obj = cls.new(**row)
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
        self.dbref = None

    def save(self):
        table_name = type(self).table

        columns = []
        values = []
        for name in dir(self.__class__):
            attr = getattr(self.__class__, name)
            if isinstance(attr, Prop):
                columns.append(attr.name)
                values.append(getattr(self, name))

        query = f'''
        REPLACE INTO {table_name} ({", ".join(columns)})
        VALUES (?{", ?"*(len(values)-1)})
        '''
        res = query_db(query, values)

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
                setattr(self, key, val)

retype = type(re.compile("Hello, world!"))
class Prop():
    def __init__(self, name, validator = None, allow_none = True):
        self.name = name
        self.validator = validator
        self.allow_none = allow_none

    def validate(self, value):
        #print("Prop.validate:", type(self.validator))
        if self.validator is None:
            return value
        elif value is None and self.allow_none:
            return None
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
        instance[self.name] = self.validate(value)

class Device(_DBType):
    table = "device"
    key = "mac"

    mac = Prop("mac", re.compile("^[0-9a-f]{2}(:[0-9a-f]{2}){5}$", re.IGNORECASE))
    description = Prop("description")
    first_seen = Prop("first_seen", float)
    last_seen = Prop("last_seen", float)
    current_version = Prop("current_version")
    current_image = Prop("current_image", re.compile("^[0-9a-f]{32}$", re.IGNORECASE))
    desired_image = Prop("desired_image", re.compile("^[0-9a-f]{32}$", re.IGNORECASE))
    category = Prop("category", "^[a-zA-Z]\w+$")

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

    name = Prop("name", "^[a-zA-Z]\w+$")
    desired_image = Prop("desired_image", "^[0-9a-f]{32}$")

    @classmethod
    def new(cls, name, desired_image = None):
        c = Category()
        c.name = name
        c.desired_image = desired_image
        return c

class Image(_DBType):
    table = "image"
    key = "md5"

    md5 = Prop("md5", "^[0-9a-f]{32}$")
    description = Prop("description")
    version = Prop("version")
    filename = Prop("filename")

    @classmethod
    def new(cls, md5, description = None, version = None, filename = None):
        i = Image()
        i.md5 = md5
        i.description = description
        i.version = version
        i.filename = filename
        return i
