const {
    registerShortcut,
    createDialog,
    closeDialog,
    getSessions,
    storage: { setToStorage },
    utils: { findAllContinuousSubsequences },
  } = window.api;
  
  function renderLabels(container) {
    const previousLabels = container.querySelectorAll(".label.session-index");
  
    for (let index = 0; index < previousLabels.length; index++) {
      previousLabels[index].remove();
    }
  
    const sessions = container.querySelectorAll(
      ".session-list-item:not(.hidden)",
    );
  
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
  
      const label = document.createElement("span");
      label.classList.add("session-index");
      label.classList.add("label");
      label.innerText = `${i + 1}`;
      session.appendChild(label);
  
      registerShortcut(`${i + 1}`, () => {
        session.click();
      });
    }
  }
  
  function renderSessionList(sessions) {
    const div = document.createElement("div");
    const sessionsCount = sessions.length;
  
    for (let i = 0; i < sessionsCount; i++) {
      const button = document.createElement("button");
      const session = sessions[i];
  
      const title = document.createElement("span");
      title.style.flex = "1";
      title.style.textAlign = "start";
      title.innerHTML = session[1];
      button.appendChild(title);
  
      button.classList.add("session-list-item");
      button.setAttribute("id", session[1]);
      button.addEventListener("click", () => {
        setToStorage("session", session[1]);
        closeDialog();
      });
  
      div.appendChild(button);
  
      if (i !== sessionsCount - 1) {
        const hr = document.createElement("hr");
        hr.style.width = "100%";
        hr.style.borderColor = "rgba(255, 255, 255, 0.1)";
  
        div.appendChild(hr);
      }
    }
  
    div.classList.add("flex", "flex-column", "session-list");
    div.style.gap = "0px";
  
    return div;
  }
  
  function highlightText(element, ...highlightedText) {
    if (element) {
      const text = element.innerText;
      let newHTML = text;
  
      if (highlightedText.join("|")) {
        newHTML = newHTML.replaceAll(
          new RegExp(`(${highlightedText.join("|")})`, "gi"),
          "<mark>$1</mark>",
        );
      }
  
      element.innerHTML = newHTML;
    }
  }
  
  /**
   * @param {Element} sessions
   */
  function renderInput(sessions) {
    const input = document.createElement("input");
    input.placeholder = "Enter session name";
    input.addEventListener("input", (ev) => {
      const query = ev.target.value;
      sessions.childNodes.forEach((session) => {
        const matches = findAllContinuousSubsequences(query, session.id);
  
        if (!query) {
          session.classList.remove("hidden");
          highlightText(session.firstChild);
        } else if (matches.length && matches.join("") === query.toLowerCase()) {
          session.classList.remove("hidden");
          highlightText(session.firstChild, ...matches);
        } else {
          session.classList.add("hidden");
          highlightText(session.firstChild);
        }
      });
  
      renderLabels(sessions);
    });
  
    return input;
  }
  
  export async function render() {
    const sessions = await getSessions();
    const title = document.createElement("h3");
    title.innerHTML = "Quick switch";
  
    const sessionsList = renderSessionList(sessions);
    const filterInput = renderInput(sessionsList);
    renderLabels(sessionsList);
  
    createDialog(title, filterInput, sessionsList);
    filterInput.focus();
  }
  
  export function init() {
    registerShortcut("meta+p", render);
  }
  