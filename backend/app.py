"""Flask API for the TMS.

Endpoints:
    GET /api/loads          -> list of loads (summary)
    GET /api/loads/<id>     -> single load with tasks + postings
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


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/loads")
def list_loads():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM loads ORDER BY rowid").fetchall()
    conn.close()
    return jsonify([load_summary(r) for r in rows])


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
