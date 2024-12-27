from openai import OpenAI
from colorama import init, Fore, Style
import textwrap
import os
from dotenv import load_dotenv

init()  # Initialize colorama

load_dotenv()  # Load environment variables from .env file

def ask_about_life():
    client = OpenAI(
        api_key = os.getenv("OPENAI_API_KEY")
    )

    question = "What is the purpose of life?"
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
    print(f"{Fore.CYAN}{border}{Style.RESET_ALL}")

if __name__ == "__main__":
    ask_about_life()
    

          # To run this on the terminal, you can use the following command:
            # python3 -m Natural\ Language\ Generation\ (NLG).o1_life