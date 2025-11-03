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

async def generate_tailored_resume_pdf(resume_text: str, job_description: str) -> str:
    """
    Orchestrates the entire resume tailoring and PDF generation process.
    
    Args:
        resume_text: The original resume content from the user.
        job_description: The job description text scraped from the page.
    
    Returns:
        The absolute file path to the generated PDF.
    """
    # Step A: Get the tailored content from the LLM service
    print("Calling LLM service for tailored content...")
    tailored_content_json = await llm_tailor_service.get_tailored_content_as_json(
        resume=resume_text, 
        job_description=job_description
    )
    print("LLM content received. Starting PDF compilation...")

    # Step B: Load the LaTeX template
    template = jinja_env.get_template('resume_template.tex')

    # Step C: Render the template with the data from the LLM
    rendered_latex = template.render(tailored_content_json)

    # Step D: Compile the rendered LaTeX to PDF in an isolated temporary directory
    unique_id = str(uuid.uuid4())
    temp_dir = os.path.abspath(f"./temp_files/{unique_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    print(f"Temporary directory created at: {temp_dir}")

    try:
        tex_filepath = os.path.join(temp_dir, 'resume.tex')
        pdf_filepath = os.path.join(temp_dir, 'resume.pdf')
        
        # Copy the required .cls style file into the compilation directory
        cls_source_path = os.path.join(template_dir, 'resume_style.cls')
        cls_dest_path = os.path.join(temp_dir, 'resume_style.cls')
        shutil.copyfile(cls_source_path, cls_dest_path)

        # Write the final .tex file
        with open(tex_filepath, 'w', encoding='utf-8') as f:
            f.write(rendered_latex)

        # Run the pdflatex command twice to resolve any cross-references
        for i in range(2):
            print(f"Running pdflatex compilation pass {i+1}...")
            process = subprocess.run(
                ['pdflatex', '-interaction=nonstopmode', '-output-directory', temp_dir, tex_filepath],
                capture_output=True, text=True, encoding='utf-8'
            )

        # Final check to ensure the PDF was created
        if not os.path.exists(pdf_filepath):
            print(f"--- LaTeX Compilation FAILED in {temp_dir} ---")
            log_path = os.path.join(temp_dir, 'resume.log')
            if os.path.exists(log_path):
                with open(log_path, 'r', encoding='utf-8') as log_file:
                    print("--- COMPILER LOG ---")
                    print(log_file.read())
                    print("--------------------")
            else:
                print("Log file not found. Raw process output:")
                print("STDOUT:", process.stdout)
                print("STDERR:", process.stderr)
            raise Exception("Failed to compile LaTeX document. Check server logs for details.")

        print(f"--- LaTeX Compilation SUCCESS ---")
        print(f"PDF generated at: {pdf_filepath}")
        return pdf_filepath

    except Exception as e:
        # Re-raise the exception to be handled by the FastAPI router
        raise e
    # Note: We are intentionally not cleaning up the temp_files for now
    # to make debugging easier. In production, you would add a finally block:
    # finally:
    #     if os.path.exists(temp_dir):
    #         shutil.rmtree(temp_dir)