import os
import streamlit as st
import re
from modules.layout import Layout
from modules.utils import Utilities
from modules.sidebar import Sidebar
from youtube_transcript_api import YouTubeTranscriptApi
from langchain.chains.summarize import load_summarize_chain
from langchain.chains import AnalyzeDocumentChain
from youtube_transcript_api import YouTubeTranscriptApi
from langchain.llms import OpenAI
import os
from langchain.text_splitter import CharacterTextSplitter

st.set_page_config(layout="wide", page_icon=""  , page_title="A S H I O Y A")

# Instantiate the main components
layout, sidebar, utils = Layout(), Sidebar(), Utilities()

st.markdown(
    f"""
    <h1 style='text-align: center;'> Insert any Youtube link and I will summarize it for you :)</h1>
    """,
    unsafe_allow_html=True,
)

user_api_key = utils.load_api_key() # Load the API key

sidebar.about() # Show the about section

if not user_api_key:
    layout.show_api_key_missing() # Show the API key missing message

else:
    os.environ["OPENAI_API_KEY"] = user_api_key # Set the API key

    script_docs = []

    def get_youtube_id(url): # Get the Youtube video ID
        video_id = None # Default value
        match = re.search(r"(?<=v=)[^&#]+", url) # Regex to get the video ID
        if match : # If the regex matches
            video_id = match.group() # Get the video ID
        else :  # If the regex doesn't match
            match = re.search(r"(?<=youtu.be/)[^&#]+", url) # Regex to get the video ID
            if match : # If the regex matches
                video_id = match.group() # Get the video ID
        return video_id 

    video_url = st.text_input(placeholder="Enter Youtube Video URL", label_visibility="hidden", label =" ")
    if video_url :
        video_id = get_youtube_id(video_url) # Get the video ID

        if video_id != "": # If the video ID is not empty
            t = YouTubeTranscriptApi.get_transcript(video_id, languages=('en','fr','es', 'zh-cn', 'hi', 'ar', 'bn', 'ru', 'pt', 'sw' )) # Get the transcript
            finalString = "" # Default value
            for item in t: # For each item in the transcript
                text = item['text'] # Get the text
                finalString += text + " " # Append the text to the final string

            text_splitter = CharacterTextSplitter() # Instantiate the text splitter
            chunks = text_splitter.split_text(finalString) # Split the text into chunks

            summary_chain = load_summarize_chain(OpenAI(temperature=0), # Load the summarization chain
                                            chain_type="map_reduce",verbose=True) # Set the temperature to 0 to get the best results
            
            # Instantiate the document chain
            summarize_document_chain = AnalyzeDocumentChain(combine_docs_chain=summary_chain)
            
            # Run the document chain
            answer = summarize_document_chain.run(chunks)

            st.subheader(answer)
