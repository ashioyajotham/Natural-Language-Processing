from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.document_loaders import GoogleDriveLoader
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

folder_id = '1K7qXSMy_SKkug3ZX5DN-2dkkrKPUkPH8'
loader = GoogleDriveLoader(folder_id = folder_id, 
                           recursive=False)

docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=4000, chunk_overlap=0, separators=["", "\n", ","]
)

texts = text_splitter.split_documents(docs)
embeddings = OpenAIEmbeddings(model="davinci")

#persist_directory = "gpt_drive"
#metadata = {"folder_id": folder_id}
db = Chroma.from_documents(texts, embedding=embeddings, collection_name="apple", metadata=None)
retriever = db.as_retriever()

llm = ChatOpenAI(temperature=0, model_name="davinci")
qa = RetrievalQA.from_chain_type(llm=llm, chain_type="stuff", retriever=retriever)

while True:
    question = input("> ")
    answer = qa.run(question)
    print(answer)

# To run the script, type
# python gpt_drive.py