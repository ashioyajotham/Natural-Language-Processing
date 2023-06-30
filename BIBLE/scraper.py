import pandas as pd
import requests
import re
import os
from bs4 import BeautifulSoup as bs
import json

# Get the list of books
url = 'https://www.biblestudytools.com/kjv/'

# Get the page
page = requests.get(url)

# Create a BeautifulSoup object
soup = bs(page.text, 'html.parser')

# Get the list of books
books = soup.find_all('a', class_='book-link')
print(books)


