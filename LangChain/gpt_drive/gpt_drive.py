from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.document_loaders import GoogleDriveLoader
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter

folder_id = '1K7qXSMy_SKkug3ZX5DN-2dkkrKPUkPH8'
loader = GoogleDriveLoader(folder_id, recursive=False)

docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=4000, chunk_overlap=0, separators=["", "\n", ","]
)

text = text_splitter.split(docs)
embeddings = OpenAIEmbeddings()
db = Chroma.from_documents(text, embeddings)
retriever = db.as_retriever()

llm = ChatOpenAI(temperature=0, model_name="davinci")
qa = RetrievalQA.from_chain_type(llm=llm, chain_type="stuff", retriever=retriever)

while True:
    question = input("> ")
    answer = qa.run(question)
    print(answer)
