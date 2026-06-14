"""(Re)create tms.db and load it with the mock data.

Run:  python seed.py
"""
from db import get_connection, init_schema
from seed_data import LOADS


def seed():
    conn = get_connection()
    init_schema(conn)

    for load in LOADS:
        pickup = load["pickup"]
        dropoff = load["dropoff"]
        driver = load.get("driver") or {}

        conn.execute(
            """
            INSERT INTO loads (
                id, load_no, customer_load_no, customer, status,
                pickup_city, pickup_state, pickup_datetime,
                dropoff_city, dropoff_state, dropoff_datetime,
                carrier, driver_name, driver_phone, driver_rating,
                customer_rate, carrier_rate,
                distance_miles, equipment, load_size, driver_type,
                weight_lbs, cargo_value, temperature_mode, temperature_f,
                current_location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                load["id"], load["loadNo"], load.get("customerLoadNo"),
                load["customer"], load["status"],
                pickup["city"], pickup["state"], pickup["dateTime"],
                dropoff["city"], dropoff["state"], dropoff["dateTime"],
                load.get("carrier"),
                driver.get("name"), driver.get("phone"), driver.get("rating"),
                load["customerRate"], load.get("carrierRate"),
                load["distanceMiles"], load.get("equipment"), load.get("loadSize"),
                load.get("driverType"), load.get("weightLbs"), load.get("cargoValue"),
                load.get("temperatureMode"), load.get("temperatureF"),
                load.get("currentLocation"),
            ),
        )

        for i, task in enumerate(load.get("tasks", [])):
            conn.execute(
                "INSERT INTO tasks (load_id, position, label, status) VALUES (?, ?, ?, ?)",
                (load["id"], i, task["label"], task["status"]),
            )

        for i, p in enumerate(load.get("postings", [])):
            agent = p.get("agent") or {}
            conn.execute(
                """
                INSERT INTO postings (
                    load_id, position, partner, reference_no, status, comments,
                    price, post_id, posted_by, posted_at, contact_methods,
                    unpost_after, unposted_by, unposted_at,
                    agent_name, agent_phone, agent_email
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    load["id"], i, p["partner"], p["referenceNo"], p["status"],
                    p.get("comments"), p.get("price"), p.get("postId"),
                    p.get("postedBy"), p.get("postedAt"), p.get("contactMethods"),
                    p.get("unpostAfter"), p.get("unpostedBy"), p.get("unpostedAt"),
                    agent.get("name"), agent.get("phone"), agent.get("email"),
                ),
            )

    conn.commit()
    count = conn.execute("SELECT COUNT(*) FROM loads").fetchone()[0]
    conn.close()
    print(f"Seeded {count} loads into tms.db")


if __name__ == "__main__":
    seed()
