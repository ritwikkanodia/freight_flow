-- TMS schema (SQLite). Bare-minimum normalization for an MVP:
-- one-to-one detail (stops, driver) is kept inline on `loads`;
-- the two one-to-many relations (tasks, postings) get their own tables.

DROP TABLE IF EXISTS postings;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS loads;

CREATE TABLE loads (
    id                TEXT PRIMARY KEY,
    load_no           TEXT NOT NULL,
    customer_load_no  TEXT,
    customer          TEXT NOT NULL,
    status            TEXT NOT NULL,

    -- pickup / drop-off stops
    pickup_city       TEXT NOT NULL,
    pickup_state      TEXT NOT NULL,
    pickup_datetime   TEXT NOT NULL,
    dropoff_city      TEXT NOT NULL,
    dropoff_state     TEXT NOT NULL,
    dropoff_datetime  TEXT NOT NULL,

    -- carrier / driver
    carrier           TEXT,
    driver_name       TEXT,
    driver_phone      TEXT,
    driver_rating     INTEGER,

    -- rates (USD)
    customer_rate     REAL NOT NULL,
    carrier_rate      REAL,

    -- load info
    distance_miles    REAL NOT NULL,
    equipment         TEXT,
    load_size         TEXT,
    driver_type       TEXT,
    weight_lbs        INTEGER,
    cargo_value       TEXT,
    temperature_mode  TEXT,
    temperature_f     INTEGER,
    current_location  TEXT
);

CREATE TABLE tasks (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    load_id   TEXT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL,
    label     TEXT NOT NULL,
    status    TEXT NOT NULL
);

CREATE TABLE postings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    load_id          TEXT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    position         INTEGER NOT NULL,
    partner          TEXT NOT NULL,
    reference_no     TEXT NOT NULL,
    status           TEXT NOT NULL,
    comments         TEXT,
    price            REAL,
    post_id          TEXT,
    posted_by        TEXT,
    posted_at        TEXT,
    contact_methods  TEXT,
    unpost_after     TEXT,
    unposted_by      TEXT,
    unposted_at      TEXT,
    agent_name       TEXT,
    agent_phone      TEXT,
    agent_email      TEXT
);

CREATE INDEX idx_tasks_load ON tasks(load_id);
CREATE INDEX idx_postings_load ON postings(load_id);
