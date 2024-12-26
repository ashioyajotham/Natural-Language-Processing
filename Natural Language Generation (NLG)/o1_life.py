from openai import OpenAI
from colorama import init, Fore, Style
import textwrap
import os

init()  # Initialize colorama

load_dotenv()  # Load environment variables from .env file

def ask_about_life():
    client = OpenAI(
        api_key =   # Replace with your API key or use environment variable
    )

    question = "What is life?"
    print(f"{Fore.YELLOW}User: {question}{Style.RESET_ALL}")
    
    response = client.chat.completions.create(
        model="o1-preview-2024-09-12",
        messages=[
            {
                "role": "user",
                "content": question
            }
        ]
    )

    # Format and print the response
    response_text = response.choices[0].message.content
    width = 80
    border = "=" * width

    print(f"\n{Fore.CYAN}{border}{Style.RESET_ALL}")
    print(f"{Fore.GREEN}🤖 AI Response:{Style.RESET_ALL}\n"
          f"  {response_text}\n")