import os
import uuid
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
AUTH = (os.getenv("NEO4J_USERNAME", "neo4j"), os.getenv("NEO4J_PASSWORD", "password"))

driver = GraphDatabase.driver(URI, auth=AUTH)

def get_session():
    return driver.session()

def get_root_points():
    query = """
    MATCH (n:KnowledgePoint)
    WHERE NOT ()-[:HAS_CHILD]->(n)
    RETURN n
    """
    with get_session() as session:
        result = session.run(query)
        return [dict(record["n"]) for record in result]

def get_point_children(point_id):
    query = """
    MATCH (p:KnowledgePoint {id: $point_id})-[:HAS_CHILD]->(c:KnowledgePoint)
    RETURN c
    """
    with get_session() as session:
        result = session.run(query, point_id=point_id)
        return [dict(record["c"]) for record in result]

def add_point(props, parent_id=None):
    point_id = str(uuid.uuid4())
    props['id'] = point_id
    
    with get_session() as session:
        session.run("CREATE (n:KnowledgePoint $props)", props=props)
        if parent_id:
            query = """
            MATCH (p:KnowledgePoint {id: $parent_id}), (c:KnowledgePoint {id: $child_id})
            CREATE (p)-[:HAS_CHILD]->(c)
            """
            session.run(query, parent_id=parent_id, child_id=point_id)
    return point_id

def update_point(point_id, props):
    query = """
    MATCH (n:KnowledgePoint {id: $point_id})
    SET n += $props
    RETURN n
    """
    with get_session() as session:
        session.run(query, point_id=point_id, props=props)

def delete_point(point_id):
    query = """
    MATCH (n:KnowledgePoint {id: $point_id})
    OPTIONAL MATCH (n)-[:HAS_CHILD*]->(m)
    DETACH DELETE n, m
    """
    with get_session() as session:
        session.run(query, point_id=point_id)

def save_nested_items(session, data, parent_id=None):
    """Recursively saves items and their children."""
    point_id = str(uuid.uuid4())
    title = data.get('title', 'Unnamed Item')
    description = data.get('description', '')
    
    session.run(
        "CREATE (n:KnowledgePoint {id: $id, title: $title, description: $description})",
        id=point_id, title=title, description=description
    )
    
    if parent_id:
        session.run(
            "MATCH (p:KnowledgePoint {id: $parent_id}), (c:KnowledgePoint {id: $child_id}) "
            "CREATE (p)-[:HAS_CHILD]->(c)",
            parent_id=parent_id, child_id=point_id
        )
    
    for child in data.get('children', []):
        save_nested_items(session, child, point_id)
    
    return point_id

def get_graph_data(point_id):
    query = """
    MATCH (p:KnowledgePoint {id: $point_id})
    OPTIONAL MATCH path = (p)-[:HAS_CHILD*]->(c:KnowledgePoint)
    WITH p, c, length(path) as level
    WITH collect(distinct {node: c, level: level}) as children, p
    WITH [{node: p, level: 0}] + children as allNodesWithLevel
    UNWIND allNodesWithLevel as item
    WITH item.node as n, item.level as level, [x in allNodesWithLevel | x.node] as nodesList
    OPTIONAL MATCH (n)-[:HAS_CHILD]->(m:KnowledgePoint)
    WHERE m IN nodesList
    RETURN 
        collect(distinct {id: n.id, title: n.title, description: n.description, level: level}) as nodes,
        collect(distinct {source: n.id, target: m.id}) as links
    """
    with get_session() as session:
        result = session.run(query, point_id=point_id)
        record = result.single()
        if not record:
            return {"nodes": [], "links": []}
        
        nodes = record["nodes"]
        links = record["links"]
        # Filter out empty links
        links = [l for l in links if l.get('source') is not None and l.get('target') is not None]
        return {"nodes": nodes, "links": links}
