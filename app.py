import os
from flask import Flask, render_template, request, jsonify
from data import get_root_points, get_point_children, add_point, update_point, delete_point, save_nested_items, get_session, get_graph_data
from proxy import generate_structure_with_ai, generate_content_with_ai

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/points', methods=['GET'])
def get_points():
    points = get_root_points()
    return jsonify(points)

@app.route('/points/<point_id>', methods=['GET'])
def get_children(point_id):
    children = get_point_children(point_id)
    return jsonify(children)

@app.route('/points', methods=['POST'])
def create_point():
    data = request.json
    parent_id = data.get('parent_id')
    props = {k: v for k, v in data.items() if k != 'parent_id'}
    point_id = add_point(props, parent_id)
    return jsonify({"id": point_id, "status": "success"}), 201

@app.route('/points', methods=['PUT'])
def edit_point():
    data = request.json
    point_id = data.get('id')
    if not point_id:
        return jsonify({"error": "id is required"}), 400
    props = {k: v for k, v in data.items() if k != 'id'}
    update_point(point_id, props)
    return jsonify({"status": "updated"})

@app.route('/points/<point_id>', methods=['DELETE'])
def remove_point(point_id):
    delete_point(point_id)
    return jsonify({"status": "deleted"})

@app.route('/points/generate', methods=['POST'])
def generate_points():
    data = request.json
    title = data.get('title')
    description = data.get('description')
    parent_id = data.get('parent_id')
    current_id = data.get('id')

    try:
        generated_data = generate_structure_with_ai(title, description)

        with get_session() as session:
            if current_id:
                # Update current node and add children
                update_point(current_id, {
                    "title": generated_data['title'], 
                    "description": generated_data['description']
                })
                for child in generated_data.get('children', []):
                    save_nested_items(session, child, current_id)
            else:
                # Create root or child node with expansion
                save_nested_items(session, generated_data, parent_id)

        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error in generation: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/points/graph/<point_id>', methods=['GET'])
def get_point_graph(point_id):
    data = get_graph_data(point_id)
    return jsonify(data)

@app.route('/generate_content', methods=['POST'])
def generate_content():
    data = request.json
    title = data.get('title')
    description = data.get('description')
    
    try:
        content = generate_content_with_ai(title, description)
        return jsonify({"content": content})
    except Exception as e:
        print(f"Error in generating content: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
