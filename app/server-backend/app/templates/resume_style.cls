% This file defines the custom layout and commands for your resume.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{resume_style}[2024/05/26 Custom Resume Style]
\LoadClass{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\usepackage{fontawesome5} % Using a modern icon package
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{} % clear all header and footer fields
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

% Adjust margins
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

% Custom command for a resume item
\newcommand{\resumeItem}[1]{
  \item\small{#1}
}

% Custom command for a list of resume items
\newenvironment{resumeItemListStart}{
  \begin{itemize}[leftmargin=0.15in, label={}]
}{
  \end{itemize}
}

% Custom command for a subheading (like a job title)
\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

% Custom command for a project heading
\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{\textwidth}{l@{\extracolsep{\fill}}r}
      \small\textbf{#1} & \small#2 \\
    \end{tabular*}\vspace{-7pt}
}

% Custom command for a list of subheadings
\newenvironment{resumeSubHeadingListStart}{
  \begin{itemize}[leftmargin=0in, label={}]
}{
  \end{itemize}
}