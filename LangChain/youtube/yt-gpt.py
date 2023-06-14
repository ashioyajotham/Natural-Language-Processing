from dotenv import load_dotenv
import os
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Set up summarization chain
from langchain.document_loaders import YoutubeLoader
from langchain import OpenAI
from langchain.chains.summarize import load_summarize_chain
from langchain.text_splitter import CharacterTextSplitter

import streamlit as st

llm = OpenAI(temperature=0)

st.set_page_config(
    page_title="A S H I O Y A",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("LangChain Demo: Summarize Youtube Videos")
st.info("This is a demo of the LangChain library. It uses the GPT-3 model to summarize Youtube videos. ")

# Add a text input
prompt = st.text_input("Enter a Youtube URL")

if prompt:
    loader = YoutubeLoader.from_youtube_url(prompt, add_video_info=False)
    docs = loader.load()
    splitter = CharacterTextSplitter(chunk_size=1000, separator=" ", chunk_overlap=50)
    split_docs = splitter.split_documents(docs)
    if split_docs:
        with st.spinner("Summarizing..."):
            chain = load_summarize_chain(llm, chain_type='map_reduce')
            summary = chain.run(split_docs)
        st.success("Done!")
        st.write(summary)

# Enable users to ask questions about the summary
st.subheader("Ask questions about the summary")
question = st.text_input("Enter a question about the summary")
if question:
    with st.spinner("Answering..."):
        answer = llm.answer(question, summary)
    st.success("Done!")
    st.write(answer)



# About on main section
st.subheader("About")
st.write("This is v1 (beta). It is still under development. Please report any issues on the Github repo.")

st.subheader("How it works")
st.write("This demo uses the GPT-3 model to summarize Youtube videos. It uses the OpenAI API to run the model. The model is then used to summarize the Youtube video. The video is split into chunks of 1000 characters. The model is run on each chunk. The chunks are then combined into a single summary.")

st.subheader("Works in progress")
st.markdown("""
- [ ] Add documnent summarization with different models
- [ ] Add music generation with MusicGen
- [ ] Text generation (Coming Soon)
""")

st.subheader("Acknowledgements")
st.write("This project could not have been possible without the following projects:")
st.markdown("""
- [PromptEngineer48](https//github.com/PromptEngineer48) for the implementation of the summarization chain. [See the full work here](https://youtube.com/watch?v=g9N8hVKPC1o)
- [Yvann-Hub](https://github.com/yvann-hub) for the implementation of the Youtube loader. [See the full work here](https://github.com/yvann-hub/Robby-chatbot)
""")

# Add year and copyright logo
st.sidebar.subheader("Copyright")
st.sidebar.write("© 2023 Ashioya Jotham")

# Make the sidebar slide
st.sidebar.subheader("About the author")
st.sidebar.markdown("""
- [![Github](https://img.shields.io/badge/Github-100000?style=for-the-badge&logo=github&logoColor=white)](<htpps://github.com/ashioyajotham>)
- [![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](<https://twitter.com/ashioyajotham>)
- [![Linkedin](https://img.shields.io/badge/Linkedin-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](<https://www.linkedin.com/in/ashioya-jotham-0b1b3b1b2/>)
""")