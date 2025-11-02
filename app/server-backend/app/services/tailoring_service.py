import os
import subprocess
import uuid
from jinja2 import Environment, FileSystemLoader

# Setup paths
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
jinja_env = Environment(loader=FileSystemLoader(template_dir))

# DEFINE THE ABSOLUTE PATH AT THE TOP OF THE FILE
PDFLATEX_PATH = "C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe"

# This is a simple test function, not the final version
async def test_latex_compilation() -> str:
    """
    A simple function to test if the pdflatex command can be executed.
    """
    # 1. Dummy data to fill the template
    test_data = {
        "name": "John Doe",
        "summary": "This is a test summary to see if the PDF compilation works."
    }

    # 2. Load and render the simple template
    template = jinja_env.get_template('resume_template.tex')
    rendered_latex = template.render(test_data)

    # 3. Save and compile
    unique_id = str(uuid.uuid4())
    temp_dir = f".\\temp_files" # Create a temp folder in the current directory for easy inspection
    os.makedirs(temp_dir, exist_ok=True)
    
    tex_filepath = os.path.join(temp_dir, f"{unique_id}.tex")
    pdf_filepath = os.path.join(temp_dir, f"{unique_id}.pdf")

    with open(tex_filepath, 'w') as f:
        f.write(rendered_latex)

    print(f"Attempting to compile {tex_filepath}...")

    # 4. Run the pdflatex command
    process = subprocess.run(
        [PDFLATEX_PATH, '-output-directory', temp_dir, tex_filepath],
        capture_output=True, text=True
    )

    # 5. Check for errors
    if not os.path.exists(pdf_filepath):
        print("--- LaTeX Compilation FAILED ---")
        print("STDOUT:", process.stdout)
        print("STDERR:", process.stderr)
        # The .log file is the most useful for debugging LaTeX errors
        with open(os.path.join(temp_dir, f"{unique_id}.log"), 'r') as log_file:
            print("LOG FILE:", log_file.read())
        raise Exception("Failed to compile LaTeX document.")
    
    print(f"--- LaTeX Compilation SUCCESS ---")
    print(f"PDF generated at: {pdf_filepath}")
    return pdf_filepath