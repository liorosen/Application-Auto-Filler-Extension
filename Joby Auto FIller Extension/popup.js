// Loading state helper
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.originalText = button.innerText;
    button.innerHTML =
      '<span style="display:inline-block;animation:spin 2s linear infinite;">⏳</span> Processing...';
  } else {
    button.disabled = false;
    button.innerHTML = button.originalText || button.innerHTML;
  }
}

// Status message helper
function showStatusMessage(message, isError = false) {
  // Remove existing status message if any
  const existingMsg = document.getElementById("status-message");
  if (existingMsg) existingMsg.remove();

  const statusMsg = document.createElement("div");
  statusMsg.id = "status-message";
  statusMsg.style.padding = "10px";
  statusMsg.style.marginTop = "10px";
  statusMsg.style.borderRadius = "4px";
  statusMsg.style.textAlign = "center";

  if (isError) {
    statusMsg.style.backgroundColor = "#ffebee";
    statusMsg.style.color = "#c62828";
    statusMsg.innerHTML = `❌ ${message}`;
  } else {
    statusMsg.style.backgroundColor = "#e8f5e9";
    statusMsg.style.color = "#2e7d32";
    statusMsg.innerHTML = `✅ ${message}`;
  }

  document.body.appendChild(statusMsg);
  setTimeout(() => {
    if (document.getElementById("status-message")) {
      document.getElementById("status-message").remove();
    }
  }, 3000);
}

// Handle resume upload
const oldInput = document.getElementById("resumeName");
if (oldInput) oldInput.parentElement.remove();

// Create upload button with improved styling
const uploadBtn = document.createElement("button");
uploadBtn.innerText = "📄 Upload CV";
uploadBtn.style.width = "100%";
uploadBtn.style.padding = "10px";
uploadBtn.style.backgroundColor = "#1a1a1a";
uploadBtn.style.color = "white";
uploadBtn.style.border = "none";
uploadBtn.style.borderRadius = "4px";
uploadBtn.style.marginBottom = "10px";
uploadBtn.style.cursor = "pointer";
uploadBtn.style.transition = "background-color 0.3s";

uploadBtn.onmouseover = () => {
  uploadBtn.style.backgroundColor = "#333";
};
uploadBtn.onmouseout = () => {
  uploadBtn.style.backgroundColor = "#1a1a1a";
};

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".pdf,.doc,.docx";
fileInput.style.display = "none";
fileInput.id = "resumeUploader";
document.body.appendChild(fileInput);

// Handle file upload
uploadBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    // Store both file name and file reference
    chrome.storage.local.set(
      {
        resumeFile: file.name,
        resumeName: file.name,
      },
      () => {
        uploadBtn.innerText = `📄 CV: ${file.name}`;
        showStatusMessage("CV uploaded successfully");
      }
    );
  }
};

// Load existing resume name from storage
chrome.storage.local.get(["resumeName"], (data) => {
  if (data.resumeName) {
    uploadBtn.innerText = `📄 CV: ${data.resumeName}`;
  }
});

// Insert button before the Save button
const saveBtn = document.getElementById("saveButton");
saveBtn.parentNode.insertBefore(uploadBtn, saveBtn);

// Load existing values into form fields
chrome.storage.sync.get(
  ["firstName", "lastName", "email", "phone", "linkedin", "website"],
  (data) => {
    for (const [key, value] of Object.entries(data)) {
      const input = document.getElementById(key);
      if (input && value) {
        input.value = value;
      }
    }
  }
);

// Save user information
saveBtn.addEventListener("click", () => {
  setButtonLoading(saveBtn, true);

  const keys = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "linkedin",
    "website",
  ];
  const data = {};
  let hasEmptyFields = false;

  keys.forEach((key) => {
    const input = document.getElementById(key);
    data[key] = input.value.trim();

    // Highlight empty required fields
    if (
      !data[key] &&
      (key === "firstName" || key === "lastName" || key === "email")
    ) {
      input.style.border = "1px solid red";
      hasEmptyFields = true;
    } else {
      input.style.border = "";
    }
  });

  if (hasEmptyFields) {
    showStatusMessage("Please fill in the required fields", true);
    setButtonLoading(saveBtn, false);
    return;
  }

  // Additional validation
  if (data.email && !isValidEmail(data.email)) {
    document.getElementById("email").style.border = "1px solid red";
    showStatusMessage("Please enter a valid email address", true);
    setButtonLoading(saveBtn, false);
    return;
  }

  chrome.storage.sync.set(data, () => {
    showStatusMessage("Information saved successfully");
    setButtonLoading(saveBtn, false);
  });
});

// Email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Get the "Fill Form" button and improve its functionality
const fillBtn = document.getElementById("fillButton");

// Enhanced fill form handler with better error handling and social URL handling
fillBtn.addEventListener("click", async () => {
  setButtonLoading(fillBtn, true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.url) {
      showStatusMessage("No active tab detected", true);
      setButtonLoading(fillBtn, false);
      return;
    }

    const url = tab.url;

    // Check if this is a social share page and try to find the actual apply link
    if (url.includes("/social?token=")) {
      showStatusMessage("Detecting application form on social page...");

      // Try to find the application link on the social sharing page
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => {
            // Look for apply buttons first
            const applyButtons = Array.from(
              document.querySelectorAll("a, button")
            ).filter((el) => {
              const text = el.textContent.toLowerCase();
              return (
                text.includes("apply") ||
                text.includes("application") ||
                text.includes("submit") ||
                text.includes("אישור")
              ); // Hebrew for confirmation
            });

            if (applyButtons.length > 0) {
              // Click the first apply button found
              console.log(
                "Found apply button, clicking:",
                applyButtons[0].textContent
              );
              applyButtons[0].click();
              return { success: true, action: "clicked_button" };
            }

            // Look for iframes with application forms
            const iframes = Array.from(document.querySelectorAll("iframe"));
            const appIframe = iframes.find((iframe) => {
              try {
                const src = iframe.src || "";
                return /comeet|apply|application|form|jobs|career|recruit|talent|position/i.test(
                  src
                );
              } catch (e) {
                return false;
              }
            });

            if (appIframe?.src) {
              return {
                success: true,
                action: "found_iframe",
                url: appIframe.src,
              };
            }

            // Try to extract application URL from the page
            const jobUrl = url.replace("/social?token=", "/apply?token=");
            return { success: true, action: "transform_url", url: jobUrl };
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Script injection failed: ",
              chrome.runtime.lastError
            );
            showStatusMessage("Cannot access page content", true);
            setButtonLoading(fillBtn, false);
            return;
          }

          const result = results?.[0]?.result;

          if (result?.success) {
            if (result.action === "found_iframe" && result.url) {
              chrome.runtime.sendMessage({
                action: "openIframe",
                iframeUrl: result.url,
              });
              showStatusMessage("Opening application form in new tab...");
            } else if (result.action === "transform_url" && result.url) {
              // Try to open a transformed URL
              chrome.tabs.create({ url: result.url }, (newTab) => {
                showStatusMessage("Opening application form in new tab...");
                // Wait for page load and then try to fill the form
                chrome.tabs.onUpdated.addListener(function listener(
                  tabId,
                  info
                ) {
                  if (tabId === newTab.id && info.status === "complete") {
                    setTimeout(() => {
                      chrome.tabs.sendMessage(newTab.id, {
                        action: "fillForm",
                      });
                    }, 2000);
                    chrome.tabs.onUpdated.removeListener(listener);
                  }
                });
              });
            } else if (result.action === "clicked_button") {
              showStatusMessage(
                "Clicked apply button, waiting for form to load..."
              );
              // Wait a bit and then try to check for form
              setTimeout(() => {
                checkForFormAndFill(tab.id);
              }, 2000);
            }
          } else {
            // Try to modify the URL directly from social to apply
            if (url.includes("comeet.co") && url.includes("/social?token=")) {
              const newUrl = url
                .replace("/social?token=", "/apply?token=")
                .replace("/social/?token=", "/apply/?token=");
              chrome.tabs.update(tab.id, { url: newUrl }, () => {
                showStatusMessage("Redirecting to application form...");
              });
            } else {
              showStatusMessage("Could not find application form link", true);
            }
          }

          setButtonLoading(fillBtn, false);
        }
      );
      return;
    }

    // For non-social pages, use standard form detection
    checkForFormAndFill(tab.id);
  } catch (error) {
    console.error("Error in fill button handler:", error);
    showStatusMessage("An error occurred: " + error.message, true);
    setButtonLoading(fillBtn, false);
  }
});

// Function to check for forms and fill them
function checkForFormAndFill(tabId) {
  showStatusMessage("Detecting application form...");

  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      func: () => {
        // Try to find application iframes with a more robust approach
        const iframes = Array.from(document.querySelectorAll("iframe"));
        console.log("Found", iframes.length, "iframes on page");

        // Log iframe sources for debugging
        iframes.forEach((iframe, i) => {
          try {
            console.log(`Iframe ${i}:`, iframe.src);
          } catch (e) {
            console.log(`Iframe ${i}: [access error]`);
          }
        });

        // Look for application forms in iframes with expanded patterns
        const appIframe = iframes.find((iframe) => {
          try {
            const src = iframe.src || "";
            return /comeet|apply|application|form|jobs|career|recruit|talent|position/i.test(
              src
            );
          } catch (e) {
            return false;
          }
        });

        // If iframe found, return its src
        if (appIframe?.src) {
          return {
            found: true,
            type: "iframe",
            url: appIframe.src,
          };
        }

        // If no iframe found, check if we're already on an application page
        const hasForm =
          document.querySelectorAll("form").length > 0 ||
          document.querySelectorAll('[role="form"]').length > 0 ||
          document.querySelectorAll(".application-form").length > 0;

        if (hasForm) {
          return {
            found: true,
            type: "direct",
            url: null,
          };
        }

        // Last resort: Look for common application field patterns
        const emailField = document.querySelector('input[type="email"]');
        const nameField = document.querySelector(
          'input[placeholder*="name" i], input[name*="name" i]'
        );

        if (emailField || nameField) {
          return {
            found: true,
            type: "fields",
            url: null,
          };
        }

        return { found: false };
      },
    },
    (results) => {
      if (chrome.runtime.lastError) {
        console.error("Script injection failed: ", chrome.runtime.lastError);
        showStatusMessage("Cannot access page content", true);
        setButtonLoading(fillBtn, false);
        return;
      }

      const result = results?.[0]?.result;
      console.log("Form detection result:", result);

      if (result?.found) {
        if (result.type === "iframe" && result.url) {
          chrome.runtime.sendMessage({
            action: "openIframe",
            iframeUrl: result.url,
          });
          showStatusMessage("Opening application form in new tab...");
        } else {
          chrome.runtime.sendMessage({ action: "fillFormDirectly" });
          showStatusMessage("Filling form directly...");
        }
      } else {
        showStatusMessage("No application form detected on this page", true);
      }

      setButtonLoading(fillBtn, false);
    }
  );
}

// Add a style tag for CSS animations
const styleTag = document.createElement("style");
styleTag.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleTag);
