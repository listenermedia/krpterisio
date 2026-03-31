import zipfile
import re
import sys
import os

def get_docx_text(path):
    """
    Take the path of a docx file as argument, return the text in unicode.
    """
    if not os.path.exists(path):
        return f"Error: File not found at {path}"

    try:
        document = zipfile.ZipFile(path)
        xml_content = document.read('word/document.xml')
        document.close()
        
        # Decode XML
        xml_str = xml_content.decode('utf-8')
        
        # Simple regex to remove XML tags and keep text
        # <w:t> contains the text
        text_chunks = re.findall(r'<w:t[^>]*>(.*?)</w:t>', xml_str)
        
        return '\n'.join(text_chunks)
    except Exception as e:
        return f"Error reading .docx: {str(e)}"

if __name__ == "__main__":
    file_path = "/Users/ashik/Desktop/PROJECTS/web-vurnability/Web Vulnerability Scanner Synopsis.docx"
    print(get_docx_text(file_path))
