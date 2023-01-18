# Use flask to deploy our chatbot
import openai
import os
import flask
from flask import Flask, request
import dotenv
#rom flask_cors import CORS, cross_origin


app = Flask(__name__, template_folder="templates")
app.static_folder = "static"
#CORS(app, support_credentials=True)

dotenv.load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
print(openai.api_key)

# Store api key in .env file
# Steps
# 1. Create a.env file
# 2. Add your api key to the.env file
# 3. Open the.env file
# 4. Add the.env file to your .gitignore file by adding the following line to the .gitignore file ".env"

# Create a virtualenv
# Steps
# 1. Create a virtualenv using dotenv on terminal by running the command "python3 -m venv venv"
# 2. Run the command "source venv/bin/activate"
# 3. Run the command "pip install -r requirements.txt"
# 4. Run the command "python3 -m pip install -r requirements.txt"

# Save the requirements in a requirements.txt file by running 
# the command "pip freeze > requirements.txt"

# Install dotenv by running the command "pip install python-dotenv"
@app.route('/', methods=['GET', 'POST']) # this is the route to the chatbot
#@cross_origin()

def index():
    if flask.request.method == 'GET':
        return (flask.render_template('index.html'))

    if flask.request.method == 'POST':

                    def chatbot():
                        # Get the input from the user
                        input_text = request.json['input_text']
                        input_text = input_text.lower()
                        input_text = input_text.strip()
                        conversation_id = request.json.get('conversation_id', None)

                        return {
                            "conversation_id": conversation_id,
                            "input_text": input_text,
                        }


                    # Create a function to get the response from the chatbot
                    def get_response(input_text):
                        # Create a prompt
                        prompt = f"""Human: {input_text}, Bot: {response}
                        """

                        response = openai.Completion.create(
                            #engine="davinci",
                            model = "babbage:ft-omdena-2023-01-18-10-00-48",
                            prompt=prompt,
                            temperature=0.7,
                            max_tokens=100,
                            top_p=1,
                            frequency_penalty=0.0,
                            presence_penalty=0.0,
                            stop=["\n"]
                        )

                        print(response.choices[0].text)
                        return flask.render_template("index.html", )

# Run the app
if __name__ == '__main__':
    app.run(debug=True)