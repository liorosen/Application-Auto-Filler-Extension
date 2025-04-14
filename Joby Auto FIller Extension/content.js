function querySelectorAllDeep(selector) {
  const traverse = (node) => {
    const results = [];
    try {
      if (node && node.nodeType === 1) {
        try {
          if (node.matches && node.matches(selector)) results.push(node);
        } catch (e) {
          console.log("Error in matches:", e);
        }

        // Try to access shadowRoot with error handling
        let children = [];
        try {
          if (node.shadowRoot) {
            children = Array.from(node.shadowRoot.children || []);
          } else {
            children = Array.from(node.children || []);
          }
        } catch (e) {
          console.log("Error accessing children:", e);
        }

        for (const child of children) {
          results.push(...traverse(child));
        }
      }
    } catch (e) {
      console.error("Error traversing DOM:", e);
    }
    return results;
  };

  try {
    return traverse(document.documentElement);
  } catch (e) {
    console.error("Error in querySelectorAllDeep:", e);
    return [];
  }
}

// Expanded field selectors to match more form variations
const FIELD_SELECTORS = {
  firstName: [
    'input[aria-label="First name"]',
    'input[name*="first" i][name*="name" i]',
    'input[id*="first" i][id*="name" i]',
    'input[placeholder*="first" i][placeholder*="name" i]',
    'input[name="fname"]',
    'input[id="fname"]',
  ],
  lastName: [
    'input[aria-label="Last name"]',
    'input[name*="last" i][name*="name" i]',
    'input[id*="last" i][id*="name" i]',
    'input[placeholder*="last" i][placeholder*="name" i]',
    'input[name="lname"]',
    'input[id="lname"]',
  ],
  email: [
    'input[aria-label="Email"]',
    'input[type="email"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[placeholder*="email" i]',
  ],
  phone: [
    'input[aria-label="Phone"]',
    'input[type="tel"]',
    'input[name*="phone" i]',
    'input[id*="phone" i]',
    'input[placeholder*="phone" i]',
    'input[name*="mobile" i]',
    'input[id*="mobile" i]',
  ],
  linkedin: [
    'input[placeholder*="LinkedIn" i]',
    'input[name*="linkedin" i]',
    'input[id*="linkedin" i]',
    'input[aria-label*="LinkedIn" i]',
    'input[placeholder*="linked in" i]',
  ],
  website: [
    'input[placeholder*="website" i]',
    'input[name*="website" i]',
    'input[id*="website" i]',
    'input[aria-label*="website" i]',
    'input[placeholder*="portfolio" i]',
    'input[name*="url" i]',
    'input[id*="url" i]',
  ],
  resume: [
    'input[type="file"]',
    'input[accept*=".pdf"]',
    'input[accept*=".doc"]',
    'input[name*="resume" i]',
    'input[id*="resume" i]',
    'input[name*="cv" i]',
    'input[id*="cv" i]',
  ],
};

function showPopup(filledFields) {
  console.log("Showing popup with filled fields:", filledFields);

  // Remove existing popup if any
  const existingPopup = document.getElementById("joby-autofill-popup");
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement("div");
  popup.id = "joby-autofill-popup";
  popup.style.position = "fixed";
  popup.style.bottom = "20px";
  popup.style.right = "20px";
  popup.style.background = "#222";
  popup.style.color = "#fff";
  popup.style.padding = "12px";
  popup.style.borderRadius = "8px";
  popup.style.zIndex = "9999";
  popup.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  popup.innerHTML =
    '<b>✅ Joby Autofill</b><ul style="margin-top: 5px; padding-left: 20px;">' +
    filledFields.map((f) => "<li>✔ " + f + "</li>").join("") +
    "</ul>";

  // Add a close button
  const closeBtn = document.createElement("div");
  closeBtn.innerHTML = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "5px";
  closeBtn.style.right = "10px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "16px";
  closeBtn.onclick = () => popup.remove();
  popup.appendChild(closeBtn);

  document.body.appendChild(popup);
  setTimeout(() => {
    if (document.getElementById("joby-autofill-popup")) {
      document.getElementById("joby-autofill-popup").remove();
    }
  }, 8000);
}

function fillForm(data) {
  console.log("Starting form fill with data:", Object.keys(data));
  const filled = [];
  const fieldMap = {
    firstName: "firstName",
    lastName: "lastName",
    email: "email",
    phone: "phone",
    linkedin: "linkedin",
    website: "website",
  };

  // Try standard query selector first, then fall back to deep selector
  for (const [type, key] of Object.entries(fieldMap)) {
    let inputFound = false;

    // First try standard DOM selectors for better performance
    for (const sel of FIELD_SELECTORS[type]) {
      const input = document.querySelector(sel);
      if (input && !input.value && data[key]) {
        console.log(`Found ${type} field with standard selector: ${sel}`);
        try {
          input.value = data[key];
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          filled.push(key);
          inputFound = true;
          break;
        } catch (e) {
          console.error(`Error filling ${type} field:`, e);
        }
      }
    }

    // If not found with standard selectors, try deep search
    if (!inputFound) {
      for (const sel of FIELD_SELECTORS[type]) {
        const inputs = querySelectorAllDeep(sel);
        if (inputs.length > 0 && !inputs[0].value && data[key]) {
          console.log(`Found ${type} field with deep selector: ${sel}`);
          try {
            inputs[0].value = data[key];
            inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
            inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
            filled.push(key);
            break;
          } catch (e) {
            console.error(`Error filling ${type} field with deep selector:`, e);
          }
        }
      }
    }
  }

  // Handle resume upload field
  let resumeFieldFound = false;
  for (const sel of FIELD_SELECTORS.resume) {
    // Try standard selector first
    const input = document.querySelector(sel);
    if (input) {
      resumeFieldFound = true;
      console.log("Found resume upload field");

      // Mark the field
      input.style.border = "2px solid orange";

      // Add note next to it
      const note = document.createElement("div");
      note.innerText =
        "📄 Upload: " + (data.resumeName || "Upload your CV manually");
      note.style.fontSize = "12px";
      note.style.color = "orange";
      note.style.fontWeight = "bold";
      note.style.marginTop = "5px";

      if (input.parentNode) {
        input.parentNode.appendChild(note);
      }
      break;
    }
  }

  // If not found with standard selector, try deep search
  if (!resumeFieldFound) {
    for (const sel of FIELD_SELECTORS.resume) {
      const inputs = querySelectorAllDeep(sel);
      if (inputs.length > 0) {
        console.log("Found resume upload field with deep selector");
        inputs[0].style.border = "2px solid orange";

        const note = document.createElement("div");
        note.innerText =
          "📄 Upload: " + (data.resumeName || "Upload your CV manually");
        note.style.fontSize = "12px";
        note.style.color = "orange";
        note.style.fontWeight = "bold";
        note.style.marginTop = "5px";

        if (inputs[0].parentNode) {
          inputs[0].parentNode.appendChild(note);
        }
        break;
      }
    }
  }

  if (filled.length > 0) {
    console.log("Successfully filled fields:", filled);
    showPopup(filled);
  } else {
    console.log("No fields were filled");
    // Show a notification that no fields could be filled
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.bottom = "20px";
    popup.style.right = "20px";
    popup.style.background = "#ff9800";
    popup.style.color = "#fff";
    popup.style.padding = "12px";
    popup.style.borderRadius = "8px";
    popup.style.zIndex = "9999";
    popup.innerHTML =
      "<b>⚠️ No matching fields found</b><br>Try manual filling instead.";
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 5000);
  }
}

// Auto-run on page load with a delay to ensure page is fully rendered
setTimeout(() => {
  console.log("Auto-filling form on page load");
  chrome.storage.sync.get(
    [
      "firstName",
      "lastName",
      "email",
      "phone",
      "linkedin",
      "website",
      "resumeName",
    ],
    (data) => {
      if (Object.keys(data).some((key) => data[key])) {
        fillForm(data);
      } else {
        console.log("No data available for auto-fill");
      }
    }
  );
}, 1000);

// Also support message-based filling
chrome.runtime.onMessage.addListener((req) => {
  console.log("Content script received message:", req);
  if (req.action === "fillForm") {
    chrome.storage.sync.get(
      [
        "firstName",
        "lastName",
        "email",
        "phone",
        "linkedin",
        "website",
        "resumeName",
      ],
      fillForm
    );
  }
});
