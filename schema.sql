PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS category (
	name VARCHAR NOT NULL PRIMARY KEY,
	desired_image VARCHAR
);

CREATE TABLE IF NOT EXISTS device (
	mac VARCHAR NOT NULL PRIMARY KEY,
	description VARCHAR,
	first_seen INTEGER,
	last_seen INTEGER,
	current_version VARCHAR,
	current_image VARCHAR,
	desired_image VARCHAR,
	category VARCHAR
);

CREATE TABLE IF NOT EXISTS image (
	md5 VARCHAR NOT NULL PRIMARY KEY,
	description VARCHAR,
	version VERCHAR,
	filename VARCHAR,
	signed NUMERIC,
	pubkey VARCHAR,
	added INTEGER,
	last_seen INTEGER
);

CREATE TABLE IF NOT EXISTS pubkey (
	description VARCHAR NOT NULL PRIMARY KEY,
	added INTEGER,
	data TEXT
);

COMMIT;
