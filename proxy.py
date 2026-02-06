import os
import json
from openai import base_url
import openai
import requests
from dotenv import load_dotenv

load_dotenv()

def generate_structure_with_ai(title, description):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("API Key missing")

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

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "model": "gpt-4-turbo-preview",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": { "type": "json_object" }
    }

    url = "https://yibuapi.com/v1"
    client = openai.OpenAI(api_key=api_key, base_url=url)
    # url = "https://api.openai.com/v1/chat/completions"
    print("Sending request to AI API...")
    try:    
        response = client.chat.completions.create(
            model="gemini-3-pro-preview",
            messages=[{"role": "user", "content": prompt}]
        )
        print(response)
        answer = response.choices[0].message.content
        
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

def generate_content_with_ai(title, description):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("API Key missing")

    prompt = f"""
    Expand on the following knowledge item with a detailed description. 
    The original title and current description are provided below.
    If there is already a description, build upon it and provide NEW information. 
    Format the output in Markdown.
    
    Title: {title}
    Current Description: {description}
    
    Provide only the detailed information.
    """

    url = "https://yibuapi.com/v1"
    client = openai.OpenAI(api_key=api_key, base_url=url)
    
    try:
        response = client.chat.completions.create(
            model="gemini-3-pro-preview",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise RuntimeError(f'API Error: {str(e)}')
