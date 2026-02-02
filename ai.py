import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def generate_structure_with_ai(title, description):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY missing")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3-pro-preview")

    # Construct the prompt
    prompt = f"""
    Based on the following knowledge item, generate a structured expansion in JSON format.
    The goal is to provide a deeper hierarchy of related concepts.
    Title: {title}
    Description: {description}

    The JSON should follow this recursive structure:
    {{
        "title": "Topic Name",
        "description": "Short explanation",
        "children": [
            {{ "title": "Subtopic", "description": "...", "children": [] }}
        ]
    }}
    Provide only the JSON object. Generate at least 2 levels of depth.
    """

    print("Sending request to Gemini API...")
    try:    
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            ),
        )
        
        answer = response.text
        
        # Clean markdown code blocks if present
        if answer.startswith("```json"):
            answer = answer[len("```json"):]
        elif answer.startswith("```"):
            answer = answer[len("```"):]
        
        if answer.endswith("```"):
            answer = answer[:-len("```")]
            
        return json.loads(answer.strip())
    except Exception as e:
        raise RuntimeError(f'API Error: {str(e)}')
