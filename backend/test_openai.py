import os
import sys
import openai

print(f"Python version: {sys.version}")
print(f"OpenAI version: {openai.__version__}")

# Try to initialize OpenAI client
try:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Warning: No OpenAI API key found in environment variables.")
        api_key = input("Enter OpenAI API key: ")
    
    # Version 1.x initialization
    client = openai.OpenAI(api_key=api_key)
    print("OpenAI client initialized successfully!")
    
    # Test a simple completion
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello!"}
            ],
            max_tokens=50
        )
        print(f"Response: {response.choices[0].message.content}")
        print("API test successful!")
    except Exception as e:
        print(f"API request failed: {e}")
        
except Exception as e:
    print(f"Failed to initialize OpenAI client: {e}") 