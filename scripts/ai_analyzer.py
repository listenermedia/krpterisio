import sys
import json
import base64
import os
from google import genai
from google.genai import types

# Use the key provided by the environment (set in .env or Cloud Run env vars)
API_KEY = os.environ.get("GEMINI_API_KEY", "")

def generate_analysis(findings_json):
  client = genai.Client(
      api_key=API_KEY,
  )

  # Prepare the prompt context based on findings
  findings = json.loads(findings_json)
  
  if not findings:
      print("No vulnerabilities found to analyze.")
      return

  findings_text = json.dumps(findings, indent=2)
  
  si_text1 = """You are a Senior Security Analyst AI for 'DeepTechno'. 
  Analyze the provided web vulnerability scan results. 
  For each finding, provide:
  1. A brief explanation of the risk.
  2. Concrete remediation steps.
  3. A severity assessment (confirming or adjusting the scanner's rating).
  
  Format your response as a clean, readable text summary suitable for a terminal output."""

  model = "gemini-2.5-flash-lite-preview-09-2025"
  
  user_message = f"""Analyze these scan findings:
  {findings_text}
  """

  contents = [
    types.Content(
      role="user",
      parts=[
        types.Part.from_text(text=user_message)
      ]
    )
  ]

  generate_content_config = types.GenerateContentConfig(
    temperature = 0.7,
    top_p = 0.95,
    max_output_tokens = 2048,
    safety_settings = [types.SafetySetting(
      category="HARM_CATEGORY_HATE_SPEECH",
      threshold="OFF"
    ),types.SafetySetting(
      category="HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold="OFF"
    ),types.SafetySetting(
      category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold="OFF"
    ),types.SafetySetting(
      category="HARM_CATEGORY_HARASSMENT",
      threshold="OFF"
    )],
    system_instruction=[types.Part.from_text(text=si_text1)],
  )

  print("\n" + "="*50)
  print("AI SECURITY ANALYSIS (Powered by Gemini 2.5)")
  print("="*50 + "\n")

  try:
      for chunk in client.models.generate_content_stream(
        model = model,
        contents = contents,
        config = generate_content_config,
        ):
        if not chunk.candidates or not chunk.candidates[0].content or not chunk.candidates[0].content.parts:
            continue
        print(chunk.text, end="", flush=True)
      print("\n\n" + "="*50 + "\n")
  except Exception as e:
      print(f"\n[Error generating AI analysis]: {e}")

if __name__ == "__main__":
    # Read findings from stdin
    try:
        input_data = sys.stdin.read()
        if input_data:
            generate_analysis(input_data)
        else:
            print("No input data received for AI analysis.")
    except Exception as e:
        print(f"Error reading input: {e}")
