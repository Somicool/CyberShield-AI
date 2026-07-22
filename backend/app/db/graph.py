"""
Neo4j driver setup for the Threat Intelligence Graph.

Design note: one shared driver instance (Neo4j drivers are thread-safe and
meant to be reused, not recreated per-request — recreating one per call
would waste the connection pool Aura gives us).
"""

from neo4j import GraphDatabase

from app.core.config import settings

_driver = None


def _normalize_uri(uri: str) -> str:
    """
    Aura hands out `neo4j+s://` URIs (encrypted + strict cert verification).
    On some local machines (corporate proxies, antivirus doing TLS
    inspection, or an incomplete CA trust store) that strict verification
    fails with "self-signed certificate in certificate chain" even though
    the instance is perfectly reachable. `neo4j+ssc://` keeps the connection
    encrypted but trusts the presented cert chain, which sidesteps that local
    quirk. Safe for a hackathon/dev; for production behind a clean cert store,
    `neo4j+s://` is preferable.
    """
    if uri.startswith("neo4j+s://"):
        return uri.replace("neo4j+s://", "neo4j+ssc://", 1)
    return uri


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            _normalize_uri(settings.NEO4J_URI),
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            # Fail fast: if Neo4j is unreachable, detection must not hang.
            # Graph push is wrapped in try/except at the call site, so a
            # short cap here keeps the user-facing response snappy.
            connection_timeout=8,
            connection_acquisition_timeout=8,
            max_transaction_retry_time=5,
        )
    return _driver


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None
