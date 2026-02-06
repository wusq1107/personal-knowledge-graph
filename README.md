# Knowledge Point Management

A full-stack application for managing knowledge points in a hierarchical graph structure using Python, Flask, and Neo4j.

## Prerequisites

- Python 3.8+
- Neo4j Database (Local or AuraDB)

## Setup

1.  **Clone the repository** (if you haven't already).
    ```bash
    cd c:\project\2026\personal-knowledge-graph
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure Neo4j**:
    Update the `.env` file with your Neo4j credentials:
    ```
    NEO4J_URI=bolt://localhost:7687
    NEO4J_USERNAME=neo4j
    NEO4J_PASSWORD=password
    GEMINI_API_KEY=your_gemini_api_key
    ```

## Running the Application

1.  Start the Flask server:
    ```bash
    python app.py
    ```

2.  Open your browser and navigate to:
    `http://localhost:5000`

## Features

-   **Backend**: Flask REST API interacting with Neo4j.
    -   GET /points: Fetch root nodes.
    -   GET /points/<id>: Fetch child nodes.
    -   POST /points: Create new points.
    -   PUT /points: Update existing points.
    -   DELETE /points/<id>: Delete points and their sub-trees.
    -   GET /points/graph/<id>: Fetch graph data (nodes and links) for a node and its descendants.
    -   POST /points/generate: Generate knowledge expansion using AI (Gemini).
-   **Frontend**: Single Page Application.
    -   Dynamic Tree View (Left Sidebar).
    -   Detail/Edit Form (Right Panel).
    -   Contextual Actions (Add Child, Delete, View Graph).
    -   Interactive Graph Visualization (using vis-network).
    -   Quick View: Click a node in the graph to see its details and description immediately.

## Data Structure

Nodes are labeled `KnowledgePoint`.
Relationships are `(:KnowledgePoint)-[:HAS_CHILD]->(:KnowledgePoint)`.
Properties include `id`, `name`, `description`, etc.
