import gradio as gr
import baseten
import os
from dotenv import load_dotenv
import base64

load_dotenv()
baseten.login(os.environ["MY_BASETEN_API_KEY"])
model = baseten.deployed_model_id('VBl31Vq') 

def generate_music(melody):
    melody = base64.b64decode(melody.split(',')[1])
    return model.predict(melody)

inputs = gr.inputs.Textbox(lines=10, label="Melody")
outputs = gr.outputs.Audio(type="file", label="Music")

title = "Music Generator"
description = "Generate music from a melody."
article = "<p style='text-align: center'>Welcome to our Music Generator! This application uses a machine learning model to generate music based on the melody you input. Simply type in your melody and let the model do the rest. Enjoy!</p>"
gr.Interface(generate_music, inputs, outputs, title=title, description=description, article=article).launch()