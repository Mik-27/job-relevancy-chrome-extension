import datetime
import os
import re
import subprocess
import uuid
import shutil
from jinja2 import Environment, FileSystemLoader

# Import the specific LLM service we need
from ..services.llm import tailoring_service as llm_tailor_service

# --- 1. Setup: Paths and Custom Filter ---

# Define the absolute path to the templates directory
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')

def latex_escape(text: str) -> str:
    """
    A custom filter to escape characters that are special in LaTeX,
    making user-generated content safe for compilation.
    """
    if not isinstance(text, str):
        return text
    
    conv = {
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\^{}',
        '\\': r'\textbackslash{}',
        "'": r"’", # Use a typographically correct apostrophe
    }
    regex = re.compile('|'.join(re.escape(str(key)) for key in sorted(conv.keys(), key=lambda item: -len(item))))
    return regex.sub(lambda match: conv[match.group()], text)

# --- 2. Configure Jinja2 Environment ---

# Initialize the Jinja2 environment with LaTeX-safe delimiters
jinja_env = Environment(
    loader=FileSystemLoader(template_dir),
    block_start_string='[%',
    block_end_string='%]',
    variable_start_string='((',
    variable_end_string='))',
    comment_start_string='[#',
    comment_end_string='#]',
    # This helps prevent errors from trailing newlines
    trim_blocks=True,
    lstrip_blocks=True
)

# Register our custom escape function as a filter
jinja_env.filters['escape_tex'] = latex_escape


# --- 3. Main Service Function ---

async def compile_latex_to_pdf(resume_data: dict) -> str:
    """
    Generates a PDF from a LaTeX template using pre-generated, structured data.
    This function's sole responsibility is PDF compilation.
    """
    
    print("PDF compilation process started with final data...")

    template = jinja_env.get_template('resume_template.tex')
    rendered_latex = template.render(resume_data)

    unique_id = str(uuid.uuid4())
    temp_dir = os.path.abspath(f"./temp_files/{unique_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        tex_filepath = os.path.join(temp_dir, 'resume.tex')
        pdf_filepath = os.path.join(temp_dir, 'resume.pdf')
        
        cls_source_path = os.path.join(template_dir, 'resume_style.cls')
        cls_dest_path = os.path.join(temp_dir, 'resume_style.cls')
        shutil.copyfile(cls_source_path, cls_dest_path)

        with open(tex_filepath, 'w', encoding='utf-8') as f:
            f.write(rendered_latex)

        for i in range(2):
            process = subprocess.run(
                ['pdflatex', '-interaction=nonstopmode', '-output-directory', temp_dir, tex_filepath],
                capture_output=True, text=True, encoding='utf-8'
            )

        if not os.path.exists(pdf_filepath):
            log_path = os.path.join(temp_dir, 'resume.log')
            if os.path.exists(log_path):
                with open(log_path, 'r', encoding='utf-8') as log_file:
                    print("--- COMPILER LOG ---")
                    print(log_file.read())
            raise Exception("Failed to compile LaTeX document. Check server logs.")

        print(f"PDF successfully generated at: {pdf_filepath}")
        return pdf_filepath

    except Exception as e:
        raise e
    # Note: We are intentionally not cleaning up the temp_files for now
    # to make debugging easier. In production, you would add a finally block:
    # finally:
    #     if os.path.exists(temp_dir):
    #         shutil.rmtree(temp_dir)
    

# Function to compile the cover letter ---
async def compile_cover_letter_to_pdf(user_profile: dict, cover_letter_text: str) -> str:
    """
    Generates a cover letter PDF from a LaTeX template, user profile data,
    and the final cover letter text.
    """
    print("Cover letter PDF compilation process started...")
    
    now = datetime.datetime.utcnow()
    date_today = now.strftime("%B %d, %Y")

    # Combine user profile and cover letter text into a single context dictionary
    context = {
        "name": f"{user_profile.first_name} {user_profile.last_name}",
        "location": user_profile.location,
        "phone": user_profile.phone_number,
        "email": user_profile.email,
        "date_today": date_today,
        "cover_letter_text": cover_letter_text
    }

    template = jinja_env.get_template('cover_letter_template.tex')
    rendered_latex = template.render(context)

    # The rest of this logic is identical to the resume compilation
    unique_id = str(uuid.uuid4())
    temp_dir = os.path.abspath(f"./temp_files/{unique_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        tex_filepath = os.path.join(temp_dir, 'cover_letter.tex')
        pdf_filepath = os.path.join(temp_dir, 'cover_letter.pdf')
        
        with open(tex_filepath, 'w', encoding='utf-8') as f:
            f.write(rendered_latex)

        # Run pdflatex command twice
        for i in range(2):
            process = subprocess.run(
                ['pdflatex', '-interaction=nonstopmode', '-output-directory', temp_dir, tex_filepath],
                capture_output=True, text=True, encoding='utf-8'
            )

        if not os.path.exists(pdf_filepath):
            # ... (error handling logic is the same)
            raise Exception("Failed to compile Cover Letter LaTeX document.")

        print(f"Cover Letter PDF generated at: {pdf_filepath}")
        return pdf_filepath

    except Exception as e:
        raise e