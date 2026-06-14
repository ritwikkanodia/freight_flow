"""Flask API for the TMS.

Endpoints:
    GET /api/loads          -> list of loads (summary)
    GET /api/loads/<id>     -> single load with tasks + postings
    GET /api/loadboard      -> live, carrier-facing feed of posted loads
    GET /api/health         -> health check

Responses are shaped to match the frontend's TypeScript `Load` interface
(camelCase), so the Next.js app consumes them directly.

Run:  python app.py   (or: flask --app app run --port 5001)
"""
import os

from flask import Flask, jsonify
from flask_cors import CORS

from db import get_connection

app = Flask(__name__)
CORS(app)


def load_summary(row):
    """Fields needed by the load list table."""
    load = {
        "id": row["id"],
        "loadNo": row["load_no"],
        "customerLoadNo": row["customer_load_no"],
        "customer": row["customer"],
        "status": row["status"],
        "pickup": {
            "city": row["pickup_city"],
            "state": row["pickup_state"],
            "dateTime": row["pickup_datetime"],
        },
        "dropoff": {
            "city": row["dropoff_city"],
            "state": row["dropoff_state"],
            "dateTime": row["dropoff_datetime"],
        },
        "carrier": row["carrier"],
        "customerRate": row["customer_rate"],
        "carrierRate": row["carrier_rate"],
    }
    if row["driver_name"]:
        load["driver"] = {
            "name": row["driver_name"],
            "phone": row["driver_phone"],
            "rating": row["driver_rating"],
        }
    return load


def load_detail(conn, row):
    """Full load incl. load info, tasks and postings."""
    load = load_summary(row)
    load.update(
        {
            "distanceMiles": row["distance_miles"],
            "equipment": row["equipment"],
            "loadSize": row["load_size"],
            "driverType": row["driver_type"],
            "weightLbs": row["weight_lbs"],
            "cargoValue": row["cargo_value"],
            "temperatureMode": row["temperature_mode"],
            "temperatureF": row["temperature_f"],
            "currentLocation": row["current_location"],
        }
    )

    tasks = conn.execute(
        "SELECT label, status FROM tasks WHERE load_id = ? ORDER BY position",
        (row["id"],),
    ).fetchall()
    load["tasks"] = [{"label": t["label"], "status": t["status"]} for t in tasks]

    postings = conn.execute(
        "SELECT * FROM postings WHERE load_id = ? ORDER BY position",
        (row["id"],),
    ).fetchall()
    load["postings"] = [posting_to_dict(p) for p in postings]

    return load


def posting_to_dict(p):
    posting = {
        "partner": p["partner"],
        "referenceNo": p["reference_no"],
        "status": p["status"],
        "comments": p["comments"],
        "price": p["price"],
        "postId": p["post_id"],
        "postedBy": p["posted_by"],
        "postedAt": p["posted_at"],
        "contactMethods": p["contact_methods"],
        "unpostAfter": p["unpost_after"],
        "unpostedBy": p["unposted_by"],
        "unpostedAt": p["unposted_at"],
    }
    if p["agent_name"]:
        posting["agent"] = {
            "name": p["agent_name"],
            "phone": p["agent_phone"],
            "email": p["agent_email"],
        }
    return posting


def loadboard_item(row):
    """A live posting joined with its load's route + freight details.

    This is the carrier-facing view: what a trucker sees on the load board.
    `row` is a join of `postings` and `loads`.
    """
    item = {
        "loadId": row["load_id"],
        "loadNo": row["load_no"],
        "partner": row["partner"],
        "referenceNo": row["reference_no"],
        "price": row["price"],
        "postedAt": row["posted_at"],
        "comments": row["comments"],
        "contactMethods": row["contact_methods"],
        "pickup": {
            "city": row["pickup_city"],
            "state": row["pickup_state"],
            "dateTime": row["pickup_datetime"],
        },
        "dropoff": {
            "city": row["dropoff_city"],
            "state": row["dropoff_state"],
            "dateTime": row["dropoff_datetime"],
        },
        "distanceMiles": row["distance_miles"],
        "equipment": row["equipment"],
        "loadSize": row["load_size"],
        "driverType": row["driver_type"],
        "weightLbs": row["weight_lbs"],
        "temperatureMode": row["temperature_mode"],
        "temperatureF": row["temperature_f"],
    }
    if row["agent_name"]:
        item["agent"] = {
            "name": row["agent_name"],
            "phone": row["agent_phone"],
            "email": row["agent_email"],
        }
    return item


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/loads")
def list_loads():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM loads ORDER BY rowid").fetchall()
    conn.close()
    return jsonify([load_summary(r) for r in rows])


@app.get("/api/loadboard")
def loadboard():
    """Live load board: every posting currently Posted to a partner board.

    This is the public, carrier-facing feed — truckers browse it to find
    loads they can haul.
    """
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT p.*, l.load_no, l.pickup_city, l.pickup_state, l.pickup_datetime,
               l.dropoff_city, l.dropoff_state, l.dropoff_datetime,
               l.distance_miles, l.equipment, l.load_size, l.driver_type,
               l.weight_lbs, l.temperature_mode, l.temperature_f
        FROM postings p
        JOIN loads l ON l.id = p.load_id
        WHERE p.status = 'Posted'
        ORDER BY p.posted_at DESC
        """
    ).fetchall()
    conn.close()
    return jsonify([loadboard_item(r) for r in rows])


@app.get("/api/loads/<load_id>")
def get_load(load_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM loads WHERE id = ?", (load_id,)).fetchone()
    if row is None:
        conn.close()
        return jsonify({"error": "Load not found"}), 404
    load = load_detail(conn, row)
    conn.close()
    return jsonify(load)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="127.0.0.1", port=port, debug=True)
