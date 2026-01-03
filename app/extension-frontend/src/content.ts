import React from 'react';
import ReactDOM from 'react-dom/client';
import { ExtensionMessage } from "./types";
import { CoverLetterDisplay } from './components/CoverLetterDisplay';
import coverLetterStyles from './components/CoverLetterDisplay.css?inline';
import spinnerStyles from './components/ui/Spinner.css?inline';
import appStyles from './App.css?inline';  

// // Debug function to save scraped text to a temporary file
// function saveScrapedTextToFile(text: string) {
//   try {
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const filename = `scraped-text-${timestamp}.txt`;
    
//     const blob = new Blob([text], { type: 'text/plain' });
//     const url = URL.createObjectURL(blob);
    
//     // Create a temporary download link
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     a.style.display = 'none';
    
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
    
//     // Clean up the URL object
//     setTimeout(() => URL.revokeObjectURL(url), 1000);
    
//     console.log(`Scraped text saved to: ${filename}`);
//   } catch (error) {
//     console.error('Failed to save scraped text:', error);
//   }
// }


// // --- NEW: Site-Specific Rules ---
// const siteRules: Record<string, string> = {
//   'www.linkedin.com': '.jobs-description__content .jobs-description-content__text',
//   'job-boards.greenhouse.io': '.job-post-container',
//   'jobs.lever.co': '.content .posting-page',
//   'www.indeed.com': '.jobsearch-InfoHeaderContainer',
//   'jobs.ashbyhq.com': '.ashby-job-posting-right-pane',
//   'amazon.jobs': '#job-detail',
//   'jobs.careers.microsoft.com': '.SearchJobDetailsCard',
//   'workdayjobs.com': '[data-automation-id="jobDescriptionContainer"]',
// };

// function findBestContentElement(): HTMLElement {
//   // --- Heuristic 1: Try common, specific selectors first ---
//   const specificSelectors = [
//     '#job-details',           // Common on many job boards
//     '.job-description',
//     '[class*="job-description"]', // Contains "job-description"
//     '#content',
//     'article',
//     'main'
//   ];

//   for (const selector of specificSelectors) {
//     const element = document.querySelector<HTMLElement>(selector);
//     if (element) {
//       console.log(`Scraper found content with specific selector: ${selector}`);
//       return element;
//     }
//   }

//   return document.body; // Fallback to body if nothing better found
// }


// function getJobDescriptionText(): string {
//   const hostname = window.location.hostname;

//   // --- Step 1: Check for a site-specific rule ---
//   const specificSelector = siteRules[hostname];
//   if (specificSelector) {
//     const element = document.querySelector<HTMLElement>(specificSelector);
//     if (element) {
//       console.log(`Scraper using specific rule for ${hostname}`);
//       return element.innerText;
//     }
//   }

//   // --- Step 2: Fallback to the heuristic approach ---
//   console.log(`No specific rule for ${hostname}. Using heuristic fallback.`);
//   const bestElement = findBestContentElement(); // This is the function from Strategy 1
//   return bestElement.innerText;
// }


// const modalInjector = import(chrome.runtime.getURL('src/modal.js'));

// --- NEW: Helper to identify if a field is a "Personal Response" question ---
function isPersonalResponseField(element: HTMLElement, label: string): boolean {
  const lowerLabel = label.toLowerCase();
  const tagName = element.tagName.toLowerCase();
  
  const piiKeywords = [
    'first name', 'last name', 'full name', 'email', 'phone', 'mobile', 
    'address', 'city', 'state', 'zip', 'postal', 'country',
    'linkedin', 'website', 'github', 'portfolio', 'twitter', 'url',
    'salary', 'authorized', 'sponsorship', 'gender', 'race', 'veteran', 'disability',
    'resume', 'cv', 'file', 'upload' // Added upload keywords to skip file inputs
  ];

  const questionKeywords = [
    'why', 'describe', 'tell us', 'cover letter', 'summary', 
    'about yourself', 'challenge', 'accomplishment', 'goal', 'experience',
    'additional', 'anything else',
    // --- NEW KEYWORDS based on your screenshot ---
    'outline', 'explain', 'elaborate', 'proficiency', 'competence' 
  ];

  // 1. Textareas are usually open-ended questions.
  // However, we must still check PII to avoid filling "Paste Resume" textareas or "Address" textareas.
  if (tagName === 'textarea') {
      // If it explicitly looks like PII, skip it. Otherwise, assume it's a question.
      if (piiKeywords.some(kw => lowerLabel.includes(kw))) return false;
      return true;
  }

  // 2. Skip known PII
  if (piiKeywords.some(kw => lowerLabel.includes(kw))) return false;

  // 3. Check for Question Keywords
  if (questionKeywords.some(kw => lowerLabel.includes(kw))) return true;

  // 4. Length Heuristic (New): 
  // If the label is very long (> 50 chars), it's likely a specific question 
  // rather than a standard field like "Name" (4 chars).
  if (label.length > 50) return true;

  return false;
}

// Helper to determine element label
function getLabel(element: HTMLElement): string {
  // 1. Check for 'aria-label'
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // 2. Check for <label for="id">
  if (element.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${element.id}"]`);
    if (label && label.textContent) return label.textContent.trim();
  }

  // 3. Check for closest parent text (Heuristic)
  let parent = element.parentElement;
  // Walk up 4 levels (increased from 3 to catch deeper nested layouts like Greenhouse/Workday)
  for (let i = 0; i < 4; i++) {
    if (parent) {
      // Clone the parent to manipulate it without affecting DOM
      const clone = parent.cloneNode(true) as HTMLElement;
      
      // Remove the input element itself from the clone so we don't read its own value as the label
      // (Simple heuristic: remove child input/select/textareas)
      const children = clone.querySelectorAll('input, select, textarea');
      children.forEach(c => c.remove());

      const text = clone.innerText.trim();
      
      // --- FIX IS HERE ---
      // Increased limit from 100 to 1000. Job questions are often long paragraphs.
      // We just check if it has ANY text content.
      if (text && text.length > 0 && text.length < 1000) {
        return text; 
      }
      
      parent = parent.parentElement;
    }
  }
  return "";
}

// Helper to check for React internal value tracker (Hack for React 15/16 inputs)
interface elementWithValueTracker extends HTMLInputElement {
  _valueTracker?: { setValue: (value: string) => void };
}

// Helper to set value (React/Angular friendly)
function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const lastValue = element.value;
  element.value = value;
  
  // React 15/16 hack to trigger change events
  const event = new Event('input', { bubbles: true });
  const tracker = (element as unknown as elementWithValueTracker)._valueTracker;
  if (tracker) {
    tracker.setValue(lastValue);
  }
  element.dispatchEvent(event);
  element.dispatchEvent(new Event('change', { bubbles: true }));
}


// --- NEW: INJECT COVER LETTER MODAL (Shadow DOM) ---

const MODAL_ROOT_ID = 'resume-analyzer-cl-modal';

function injectCoverLetterModal(text: string) {
  // Prevent duplicate modals
  if (document.getElementById(MODAL_ROOT_ID)) return;

  // 1. Host
  const host = document.createElement('div');
  host.id = MODAL_ROOT_ID;
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100vw';
  host.style.height = '100vh';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none'; // Let clicks pass through background initially
  document.body.appendChild(host);

  // 2. Shadow
  const shadow = host.attachShadow({ mode: 'open' });

  // 3. Styles
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    * { box-sizing: border-box; }
    /* Reset pointer events for the modal content itself */
    .modal-overlay { pointer-events: auto; }
    
    ${appStyles} 
    ${coverLetterStyles}
    ${spinnerStyles}

    /* Fix font inheritance inside Shadow DOM */
    div, p, h1, h2, h3, button, textarea { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  `;
  shadow.appendChild(styleTag);

  // 4. Mount React
  const rootDiv = document.createElement('div');
  shadow.appendChild(rootDiv);
  const root = ReactDOM.createRoot(rootDiv);

  const handleClose = () => {
    root.unmount();
    host.remove();
  };

  root.render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(CoverLetterDisplay, { initialText: text, onClose: handleClose })
    )
  );
}



chrome.runtime.onMessage.addListener(
  (request: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse) => {
    
    // Handle the original scrape request
    if (request.type === "scrapeText") {
      const pageText = document.body.innerText;
      sendResponse({ text: pageText });
      return true;
    }

    // --- Handle the request to show the cover letter modal ---
    if (request.type === "showCoverLetterModal") {
      injectCoverLetterModal(request.text);
      sendResponse({ success: true });
      return true;
    }

    // --- SCAN FORM - AUTOFILL ---
    if (request.type === "scanPageForAutofill") {
      // Only look for text inputs and textareas. Ignore selects/radios/checkboxes for now based on your request.
      const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea')) as HTMLElement[];
    
      const fields = inputs
        .map((el) => {
          // Generate ID if missing
          if (!el.id) el.id = 'frog_autofill_' + Math.random().toString(36).substr(2, 9);
        
          const label = getLabel(el);
          return {
            id: el.id,
            element: el, // Temp reference for filtering
            type: el.tagName.toLowerCase(),
            label: label
          };
        })
        .filter(f => {
          // Apply the filter logic
          return f.label.length > 0 && isPersonalResponseField(f.element, f.label);
        })
        .map(f => ({
          // Clean up object for sending to background (remove DOM element reference)
          id: f.id,
          type: f.type,
          label: f.label
        }));

      console.log(`Found ${fields.length} personal response fields.`);
      sendResponse({ fields: fields });
      return true;
    }

    // --- APPLY AUTOFILL ---
    if (request.type === "applyAutofill") {
        const mappings = request.mappings;
        let count = 0;

        for (const [id, value] of Object.entries(mappings)) {
        const element = document.getElementById(id);
        
        // Ensure element exists and is a valid input type
        if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
            setNativeValue(element, value);
            
            element.style.backgroundColor = "#f0fdf4";
            element.style.border = "2px solid #27c77d";
            element.title = "Filled by AI Agent";
            
            count++;
        }
        }
        sendResponse({ success: true, count });
        return true;
    }
    return true;
  }
);

// chrome.runtime.onMessage.addListener(
//   (
//     request: ChromeMessage, 
//     sender: chrome.runtime.MessageSender, 
//     sendResponse: (response: ScrapeTextResponse) => void
//   ) => {
//     console.log("Sender:", sender);
//     if (request.type === "scrapeText") {
//       console.log("Content script received scrapeText message.");
//       const pageText = document.body.innerText;
      
//       // Debug: Save scraped text to file
//     //   saveScrapedTextToFile(pageText);
      
//       sendResponse({ text: pageText });
//     }
//     return true; // Keep channel open for async response
//   }
// );