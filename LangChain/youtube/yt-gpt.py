from Ipython.display import YouTubeVideo

from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from langchain.document_loaders import YoutubeLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import LLMChain
from langchain.llms import HuggingFacePipeline
from langchain.chains.summarize import load_summarize_chain
import torch
import langchain

YouTubeVideo('Y_O-x-itHaU', width=700, height=500)

# load video
loader = YoutubeLoader.from_youtube_url('https://www.youtube.com/watch?v=Y_O-x-itHaU')
text = loader.load()

# split text into sentences
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
sentences = splitter.split_documents(text)

# load language model
model_repo = 