let contextMenuTriggerButton = null;
const SERVER_URL = `https://chat.jaay.fun`;

function isChatHistoryLoaded() {
    const chatHistoryContainer = document.querySelector(".fb0a63fb"); 
    return chatHistoryContainer !== null;
}

function isDropdownMenuOpen() {
    const dropdownMenu = document.querySelector('.ds-dropdown-menu[role="menu"]');
    return dropdownMenu && dropdownMenu.children.length > 0;
}

function removeDropdownChildren() {
    const dropdownMenu = document.querySelector('.ds-dropdown-menu[role="menu"]');
    if (dropdownMenu) {
        while (dropdownMenu.firstChild) {
            dropdownMenu.removeChild(dropdownMenu.firstChild);
        }
    }
}

function showSecondOverlay(url, isPasswordProtected = false) {
    const overlay = document.createElement("div");
    overlay.className = "second-overlay";
    overlay.innerHTML = `
        <div class="second-overlay-content">
            <div class="url-container">
                <span class="url-text">${url}</span>
                <div class="copy-icon"></div>
            </div>
            <div>
                <button class="copy-button">Copy URL</button>
                <button class="close-button">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const copyButton = overlay.querySelector(".copy-button");
    copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(url).then(() => {
            alert("URL copied to clipboard!");
            overlay.remove(); 
        });
    });

    const closeButton = overlay.querySelector(".close-button");
    closeButton.addEventListener("click", () => {
        overlay.remove();
    });
}
function showSettingsOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "settings-overlay";
    overlay.innerHTML = `
        <div class="settings-overlay-content">
            <h2>Share Settings</h2>
            <div class="settings-option">
                <label>
                    <input type="radio" name="link-type" value="public" checked> Public Link (No Password)
                </label>
            </div>
            <div class="settings-option">
                <label>
                    <input type="radio" name="link-type" value="private"> Private Link (Password Protected)
                </label>
                <div class="password-field" style="display: none;">
                    <input type="password" placeholder="Enter Password" id="password-input">
                    <button class="show-password-button">Show</button>
                </div>
            </div>
            <div class="settings-option">
                <label>
                    <input type="checkbox" id="expiry-checkbox"> Set Expiry Date
                </label>
                <div class="expiry-fields" style="display: none;">
                    <input type="number" id="days" placeholder="Days" min="0">
                    <input type="number" id="hours" placeholder="Hours" min="0" max="23">
                    <input type="number" id="minutes" placeholder="Minutes" min="0" max="59">
                </div>
            </div>
            <div class="settings-buttons">
                <button class="create-button">Create</button>
                <button class="cancel-button">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const linkTypeRadios = overlay.querySelectorAll('input[name="link-type"]');
    const passwordField = overlay.querySelector('.password-field');
    const expiryCheckbox = overlay.querySelector('#expiry-checkbox');
    const expiryFields = overlay.querySelector('.expiry-fields');
    const passwordInput = overlay.querySelector('#password-input');
    const showPasswordButton = overlay.querySelector('.show-password-button');
    const createButton = overlay.querySelector('.create-button');

    linkTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'private') {
                passwordField.style.display = 'flex';
            } else {
                passwordField.style.display = 'none';
            }
        });
    });

    expiryCheckbox.addEventListener('change', () => {
        if (expiryCheckbox.checked) {
            expiryFields.style.display = 'block';
        } else {
            expiryFields.style.display = 'none';
        }
    });

    showPasswordButton.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            showPasswordButton.textContent = 'Hide';
        } else {
            passwordInput.type = 'password';
            showPasswordButton.textContent = 'Show';
        }
    });

    createButton.addEventListener('click', async () => {
        createButton.disabled = true;
        createButton.innerHTML = `<div class="loader"></div> Creating...`;

        const isPrivateLink = overlay.querySelector('input[name="link-type"]:checked').value === 'private';
        const password = isPrivateLink ? overlay.querySelector('#password-input').value : null;
        const expiry = expiryCheckbox.checked ? {
            days: parseInt(overlay.querySelector('#days').value) || 0,
            hours: parseInt(overlay.querySelector('#hours').value) || 0,
            minutes: parseInt(overlay.querySelector('#minutes').value) || 0
        } : null;

        const buttonName = contextMenuTriggerButton.querySelector(".c08e6e93").innerText;
        // deepseek doesn't store chat id in html so had to found my own way to get chat id
        // :( if it works it works !!! 
        const token = localStorage.getItem("userToken");
        const parsedToken = JSON.parse(token);

        try {
            const data = await fetch("https://chat.deepseek.com/api/v0/chat_session/fetch_page?count=500", {
                method: "GET",
                credentials: "include",
                headers: {
                    "Authorization": `Bearer ${parsedToken.value}`
                }
            });

            const body = await data.json();
            const chat_sessions = body.data.biz_data.chat_sessions;
            let found_id = null;

            for (let i = 0; i < chat_sessions.length; i++) {
                const title = chat_sessions[i].title;
                if (title === buttonName) {
                    found_id = chat_sessions[i].id;
                    break;
                }
            }

            if (found_id) {
                const url = `https://chat.deepseek.com/api/v0/chat/history_messages?chat_session_id=${found_id}`;
                const data = await fetch(url, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Authorization": `Bearer ${parsedToken.value}`
                    }
                });

                const body = await data.json();
                const messages = body.data.biz_data;

                const upload_data = await fetch(SERVER_URL+"/api", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages,
                        settings: {
                            isPrivateLink,
                            password,
                            expiry
                        }
                    })
                });

                const response = await upload_data.json();
                const id = response.id;
                const shareableUrl = `${SERVER_URL}/${id}`;

                overlay.querySelector('.settings-overlay-content').innerHTML = `
                    <h2>Shareable Link</h2>
                    <div class="url-container">
                        <span class="url-text">${shareableUrl}</span>
                        <button class="copy-url-button">Copy URL</button>
                    </div>
                    <button class="close-button">Close</button>
                `;

                const copyUrlButton = overlay.querySelector('.copy-url-button');
                copyUrlButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(shareableUrl).then(() => {
                        alert("URL copied to clipboard!");
                    });
                });

                const closeButton = overlay.querySelector('.close-button');
                closeButton.addEventListener('click', () => {
                    overlay.remove();
                });
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred. Please try again.");
            createButton.disabled = false;
            createButton.textContent = "Create";
        }
    });

    const cancelButton = overlay.querySelector('.cancel-button');
    cancelButton.addEventListener('click', () => {
        overlay.remove();
    });
}

function trackContextMenuTrigger(event) {
    const button = event.target.closest(".aa7b7ebb");
    if (button) {
        const parentContainer = button.closest(".f9edaa3c");
        if (parentContainer) {
            const buttonText = parentContainer.querySelector(".c08e6e93").innerText;
            contextMenuTriggerButton = parentContainer;
        }
    }
}

function showDimmerOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "dimmer-overlay";
    overlay.innerHTML = `
        <div class="loading-indicator">Loading...</div>
    `;
    document.body.appendChild(overlay);
}

function hideDimmerOverlay() {
    const overlay = document.querySelector(".dimmer-overlay");
    if (overlay) {
        overlay.remove();
    }
}

function injectShareButton() {
    const dropdownMenu = document.querySelector('.ds-dropdown-menu[role="menu"]');
    if (dropdownMenu && !dropdownMenu.querySelector(".ds-dropdown-menu-option__label[data-action='share']")) {
        const dropdownItems = dropdownMenu.children;

        if (dropdownItems.length >= 2) {
            const shareButton = document.createElement("div");
            shareButton.className = "ds-dropdown-menu-option ds-dropdown-menu-option--none";
            shareButton.style.cursor = "pointer";

            const iconContainer = document.createElement("div");
            iconContainer.className = "ds-dropdown-menu-option__icon";

            const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            iconSvg.setAttribute("width", "24");
            iconSvg.setAttribute("height", "24");
            iconSvg.setAttribute("viewBox", "0 0 24 24");
            iconSvg.setAttribute("fill", "none");
            iconSvg.innerHTML = `
                <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.35C15.11 18.56 15.08 18.78 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z" fill="currentColor"/>
            `;

            iconContainer.appendChild(iconSvg);

            const labelContainer = document.createElement("div");
            labelContainer.className = "ds-dropdown-menu-option__label";
            labelContainer.setAttribute("data-action", "share");
            labelContainer.innerText = "Share";

            shareButton.appendChild(iconContainer);
            shareButton.appendChild(labelContainer);

            shareButton.addEventListener("click", () => {
                if (contextMenuTriggerButton) {
                    removeDropdownChildren();
                    showSettingsOverlay();
                } else {
                    console.error("No context menu trigger button found ERR!!!!");
                }
            });

            dropdownMenu.insertBefore(shareButton, dropdownItems[1]);
        }
    }
}

function observeDOM() {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                if (isChatHistoryLoaded()) {
                    document.querySelectorAll(".aa7b7ebb").forEach((button) => {
                        button.addEventListener("click", trackContextMenuTrigger);
                    });
                }

                if (isDropdownMenuOpen() && isChatHistoryLoaded()) {
                    injectShareButton();
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

observeDOM();