chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Background script received message:", msg);

  if (msg.action === "openIframe" && msg.iframeUrl) {
    console.log("Opening iframe URL:", msg.iframeUrl);

    // Handle social URLs directly - transform and redirect
    let targetUrl = msg.iframeUrl;
    if (targetUrl.includes("/social?token=")) {
      targetUrl = targetUrl.replace("/social?token=", "/apply?token=");
      console.log("Transformed social URL to apply URL:", targetUrl);
    }

    // Verify if URL is valid before creating tab
    try {
      const url = new URL(targetUrl);

      chrome.tabs.create({ url: url.href }, (tab) => {
        console.log("Tab created with ID:", tab.id);

        // Wait for page load and inject content script with a more reliable approach
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === "complete") {
            console.log(
              "Tab loaded completely, waiting additional time before detecting form..."
            );

            // Add a small delay to ensure page is fully rendered
            setTimeout(() => {
              console.log("Now checking for form elements...");

              // Improved form detection with more selectors
              chrome.scripting.executeScript(
                {
                  target: { tabId: tab.id },
                  func: () => {
                    // More comprehensive form detection
                    const forms = document.querySelectorAll("form");
                    const formRoles =
                      document.querySelectorAll('[role="form"]');
                    const formClasses = document.querySelectorAll(
                      ".application-form, .job-application, .apply-form"
                    );
                    const inputGroups = document.querySelectorAll(
                      'div:has(input[type="text"]):has(input[type="email"])'
                    );

                    // Also look for apply buttons if we still see social sharing UI
                    let socialUI = false;
                    if (document.URL.includes("/social")) {
                      socialUI = true;
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
                        console.log("Found and clicking apply button");
                        applyButtons[0].click();
                        return { socialPageWithButton: true };
                      }
                    }

                    console.log("Form elements found:", {
                      forms: forms.length,
                      formRoles: formRoles.length,
                      formClasses: formClasses.length,
                      inputGroups: inputGroups.length,
                      socialUI: socialUI,
                    });

                    if (socialUI) {
                      return { socialPage: true };
                    }

                    return (
                      forms.length > 0 ||
                      formRoles.length > 0 ||
                      formClasses.length > 0 ||
                      inputGroups.length > 0
                    );
                  },
                },
                (results) => {
                  const result = results?.[0]?.result;

                  // Handle social page with button
                  if (result && result.socialPageWithButton) {
                    console.log(
                      "Social page with button clicked, waiting for form to load"
                    );
                    setTimeout(() => {
                      chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                          chrome.runtime.sendMessage({ action: "fillForm" });
                        },
                      });
                    }, 2000);
                    return;
                  }

                  // Handle still on social page
                  if (result && result.socialPage) {
                    console.log(
                      "Still on social page, trying URL transformation"
                    );

                    // Try to transform URL directly
                    const currentUrl = tab.url;
                    if (currentUrl.includes("/social")) {
                      const newUrl =
                        currentUrl.replace("/social", "/apply").split("?")[0] +
                        "?direct=1";
                      chrome.tabs.update(tab.id, { url: newUrl });
                    }
                    return;
                  }

                  const hasForm = result === true;
                  console.log("Form detection result:", hasForm);

                  if (hasForm) {
                    // If form detected, trigger fill
                    chrome.scripting.executeScript({
                      target: { tabId: tab.id },
                      func: () => {
                        console.log("Triggering form fill...");
                        chrome.runtime.sendMessage({ action: "fillForm" });
                      },
                    });
                  } else {
                    console.log(
                      "No form detected on page, looking for input fields directly"
                    );

                    // Try a second approach - look for common input fields directly
                    chrome.scripting.executeScript(
                      {
                        target: { tabId: tab.id },
                        func: () => {
                          const nameInput = document.querySelector(
                            'input[name*="name" i], input[id*="name" i], input[placeholder*="name" i]'
                          );
                          const emailInput = document.querySelector(
                            'input[type="email"], input[name*="email" i], input[id*="email" i]'
                          );

                          console.log("Direct input detection:", {
                            nameFound: !!nameInput,
                            emailFound: !!emailInput,
                          });

                          return !!nameInput || !!emailInput;
                        },
                      },
                      (inputResults) => {
                        const hasInputs = inputResults?.[0]?.result;

                        if (hasInputs) {
                          chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => {
                              console.log(
                                "Found direct input fields, attempting to fill..."
                              );
                              chrome.runtime.sendMessage({
                                action: "fillForm",
                              });
                            },
                          });
                        } else {
                          // Show notification if no form or inputs found
                          chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => {
                              alert(
                                "No application form detected on this page. Please check if you're on the correct page or fill manually."
                              );
                            },
                          });
                        }
                      }
                    );
                  }
                }
              );
            }, 1500); // 1.5 second delay for page to fully render

            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      });
    } catch (e) {
      console.error("Invalid iframe URL:", e);
      // Notify user of invalid URL
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (errorMsg) => {
              alert("Error opening form: " + errorMsg);
            },
            args: [e.toString()],
          });
        }
      });
    }
  } else if (msg.action === "fillFormDirectly") {
    console.log("Attempting to fill form directly");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Check if this is a social URL and transform if needed
        const url = tabs[0].url;
        if (url.includes("/social?token=")) {
          const newUrl = url.replace("/social?token=", "/apply?token=");
          chrome.tabs.update(tabs[0].id, { url: newUrl }, () => {
            // Wait for page load before filling
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tabs[0].id && info.status === "complete") {
                setTimeout(() => {
                  chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                      chrome.runtime.sendMessage({ action: "fillForm" });
                    },
                  });
                }, 1500);
                chrome.tabs.onUpdated.removeListener(listener);
              }
            });
          });
        } else {
          // Regular form filling for non-social URLs
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              chrome.runtime.sendMessage({ action: "fillForm" });
            },
          });
        }
      }
    });
  }
});
