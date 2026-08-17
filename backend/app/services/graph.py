"""
Threat Intelligence Graph service: pushes detected entities (URLs/domains,
emails, phone numbers, wallet addresses, Telegram handles) into Neo4j and
connects them to the Incident that surfaced them.

Graph shape:
    (Incident)-[:INVOLVES]->(Domain)
    (Incident)-[:INVOLVES]->(Email)
    (Incident)-[:INVOLVES]->(Phone)
    (Incident)-[:INVOLVES]->(Wallet)
    (Incident)-[:INVOLVES]->(TelegramHandle)

Why this shape: connecting everything through the Incident node (rather
than directly linking entities to each other) means "what's connected to
X" is answered by traversing Incident -> other entities on the SAME
incident, or entity -> other incidents -> their other entities. This is
exactly how real cybercrime network discovery works — "this wallet address
showed up in the same scam message as this phone number" is a two-hop
graph query, not something we have to hand-model as a direct edge.

All writes use MERGE (not CREATE) so re-processing the same entity/incident
never creates duplicates — running this twice on the same data is safe.
"""

from app.db.graph import get_driver
from app.ml.entity_extraction import extract_all_entities


def push_incident_to_graph(incident_id: str, incident_type: str, domain: str | None, raw_content: str) -> dict:
    """
    Extracts entities from raw_content and pushes the incident + all
    connected entities into the graph.

    Returns a summary of what was pushed, e.g.:
        {"domain": "x.com", "emails": 1, "phone_numbers": 0, "wallets": 1, "telegram_handles": 0}
    """
    entities = extract_all_entities(raw_content)
    driver = get_driver()

    with driver.session() as session:
        session.execute_write(_create_incident_node, incident_id, incident_type)

        if domain:
            session.execute_write(_link_entity, incident_id, "Domain", "value", domain)

        for email in entities["emails"]:
            session.execute_write(_link_entity, incident_id, "Email", "value", email)

        for phone in entities["phone_numbers"]:
            session.execute_write(_link_entity, incident_id, "Phone", "value", phone)

        for btc in entities["wallets"]["bitcoin"]:
            session.execute_write(_link_entity, incident_id, "Wallet", "value", btc, extra={"chain": "bitcoin"})

        for eth in entities["wallets"]["ethereum"]:
            session.execute_write(_link_entity, incident_id, "Wallet", "value", eth, extra={"chain": "ethereum"})

        for handle in entities["telegram_handles"]:
            session.execute_write(_link_entity, incident_id, "TelegramHandle", "value", handle)

    return {
        "domain": domain,
        "emails": len(entities["emails"]),
        "phone_numbers": len(entities["phone_numbers"]),
        "wallets": len(entities["wallets"]["bitcoin"]) + len(entities["wallets"]["ethereum"]),
        "telegram_handles": len(entities["telegram_handles"]),
    }


def _create_incident_node(tx, incident_id: str, incident_type: str):
    tx.run(
        """
        MERGE (i:Incident {id: $incident_id})
        SET i.type = $incident_type
        """,
        incident_id=incident_id,
        incident_type=incident_type,
    )


def _link_entity(tx, incident_id: str, label: str, key: str, value: str, extra: dict | None = None):
    extra = extra or {}
    tx.run(
        f"""
        MATCH (i:Incident {{id: $incident_id}})
        MERGE (e:{label} {{{key}: $value}})
        SET e += $extra
        MERGE (i)-[:INVOLVES]->(e)
        """,
        incident_id=incident_id,
        value=value,
        extra=extra,
    )


def delete_incident_from_graph(incident_id: str) -> None:
    """
    Removes an Incident node and its INVOLVES relationships from the graph.

    Shared entities (domains, wallets, handles...) are deliberately kept when
    other incidents still reference them — only entities left orphaned by this
    deletion are removed, so the graph never accumulates dangling nodes that
    belong to no case.
    """
    driver = get_driver()
    with driver.session() as session:
        session.execute_write(_delete_incident_node, incident_id)


def _delete_incident_node(tx, incident_id: str):
    tx.run("MATCH (i:Incident {id: $incident_id}) DETACH DELETE i", incident_id=incident_id)
    tx.run(
        """
        MATCH (e)
        WHERE (e:Domain OR e:Email OR e:Phone OR e:Wallet OR e:TelegramHandle)
          AND NOT (e)<-[:INVOLVES]-(:Incident)
        DELETE e
        """
    )


def get_connected_entities(entity_label: str, entity_value: str) -> dict:
    """
    Given an entity (e.g. a domain), finds everything connected to it
    through shared incidents — other domains, emails, phones, wallets,
    telegram handles that appeared in the same incidents, plus the
    incidents themselves. This is the "discover cybercrime networks" query.
    """
    driver = get_driver()

    with driver.session() as session:
        result = session.execute_read(_query_connections, entity_label, entity_value)
        return result


def _query_connections(tx, entity_label: str, entity_value: str) -> dict:
    query = f"""
    MATCH (e:{entity_label} {{value: $value}})<-[:INVOLVES]-(i:Incident)-[:INVOLVES]->(connected)
    WHERE connected <> e
    RETURN DISTINCT
        labels(connected) AS connected_labels,
        connected AS connected_props,
        i.id AS via_incident_id
    """
    records = tx.run(query, value=entity_value)

    connections = []
    for record in records:
        connections.append({
            "type": record["connected_labels"][0] if record["connected_labels"] else "Unknown",
            "properties": dict(record["connected_props"]),
            "via_incident_id": record["via_incident_id"],
        })

    return {
        "entity_type": entity_label,
        "entity_value": entity_value,
        "connections": connections,
    }
