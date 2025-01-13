const {
    runCommand,
    ipcRenderer,
    events: {
      application: { move, position },
      terminal: { focus, input },
    },
    storage: { setToStorage, subscribeToStorageValue },
    registerShortcut,
    createDialog,
    closeDialog,
  } = window.api;
  
  const windowRegex =
    /^(\d+): (.*) \((\d+) panes\) \[(\d+)x(\d+)\] .*(\@\d+)( \((active)\))?/;
  
  let currentSession;
  let currentWindow;
  
  const titleBar = document.getElementById("titlebar");
  const searchBar = document.getElementById("search-bar");
  const rightTitleBarActions = document.getElementById("title-bar-right-actions");
  
  function renameSession() {
    const title = document.createElement("h4");
    title.innerText = "Enter new session name";
  
    const newSessionName = document.createElement("input");
    newSessionName.defaultValue = currentSession;
  
    const submitBtn = document.createElement("button");
    submitBtn.classList.add("primary");
    submitBtn.innerText = "Confirm";
  
    const form = document.createElement("form");
    form.appendChild(newSessionName);
    form.appendChild(submitBtn);
    form.classList.add("flex", "flex-column");
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const sessionName = newSessionName.value.split(" ").join("_");
      runCommand(`tmux rename-session -t ${currentSession} ${sessionName}`).then(
        () => {
          setToStorage("session", sessionName);
          closeDialog();
        },
      );
    };
  
    createDialog(title, form);
    newSessionName.focus();
    newSessionName.select();
  }
  
  function renameWindow() {
    const title = document.createElement("h4");
    title.innerText = "Enter new window name";
  
    const newWindowName = document.createElement("input");
  
    const submitBtn = document.createElement("button");
    submitBtn.classList.add("primary");
    submitBtn.innerText = "Confirm";
  
    const form = document.createElement("form");
    form.appendChild(newWindowName);
    form.appendChild(submitBtn);
    form.classList.add("flex", "flex-column");
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const windowName = newWindowName.value.split(" ").join("_");
      runCommand(
        `tmux rename-window -t ${currentSession}:${currentWindow} ${windowName}`,
      ).then(() => {
        renderTabs();
        closeDialog();
      });
    };
  
    createDialog(title, form);
    newWindowName.focus();
  }
  
  function createNewTmuxWindow() {
    runCommand(
      `tmux display-message -t '${currentSession}' -p '#{pane_current_path}'`,
    ).then(({ stdout }) => {
      const currentPath = stdout.toString().trim();
  
      runCommand(
        "tmux",
        "new-window",
        "-t",
        currentSession,
        "-c",
        currentPath,
      ).then(() => {
        runCommand(
          `tmux display-message  -t ${currentSession} -p '#{window_index}'`,
        ).then((output) => {
          setToStorage("activeWindow", parseInt(output.stdout.toString()));
        });
      });
    });
  }
  
  function deleteTmuxWindow(windowId = currentWindow) {
    runCommand("tmux", "kill-window", "-t", `${currentSession}:${windowId}`).then(
      renderTabs,
    );
  }
  
  function setSelectedWindow(windowId) {
    setToStorage("activeWindow", windowId);
  }
  
  async function getSessionWindows() {
    return await runCommand("tmux", "list-windows", "-t", currentSession);
  }
  
  function parseWindow(window) {
    const match = windowRegex.exec(window);
  
    if (match) {
      return [parseInt(match[1], 10), match[2], match[8]];
    }
  }
  
  function activateTab(windowId) {
    const tabs = document.querySelectorAll(".tab");
  
    for (const tab of tabs) {
      tab.classList.remove("active");
      if (tab.getAttribute("id") === `tab_${windowId}`) {
        tab.classList.add("active");
      }
    }
  }
  
  function createTab(tmuxWindow) {
    const [id, name, active] = parseWindow(tmuxWindow);
    const tabId = `${currentSession} tab_${id}`;
    const tab = document.createElement("div");
  
    tab.classList.add("tab");
  
    if (active) {
      tab.classList.add("active");
    }
  
    tab.setAttribute("id", tabId);
    tab.addEventListener("click", () => {
      setSelectedWindow(id);
    });
    tab.addEventListener("dblclick", () => {
      renameWindow();
    });
    tab.innerHTML = name;
    tab.appendChild(createCloseButton(id));
  
    return tab;
  }
  
  function createCloseButton(windowId) {
    const button = document.createElement("button");
    button.classList.add("icon-button", "s", "close-button");
    button.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteTmuxWindow(windowId);
    });
  
    return button;
  }
  
  function createNewTabButton() {
    const button = document.createElement("button");
    button.setAttribute("id", "new-tab");
    button.classList.add("icon-button", "m", "create-new-tab");
    button.addEventListener("click", createNewTmuxWindow);
  
    rightTitleBarActions.appendChild(button);
  }
  
  function renderTabs() {
    const tabsContainer = document.getElementById("tabs");
    const tabsContainerClone = tabsContainer.cloneNode();
    getSessionWindows().then((data) => {
      const windows = data.stdout.toString().trim().split("\n");
  
      for (let i = 0; i < windows.length; i++) {
        const w = windows[i];
        tabsContainerClone.appendChild(createTab(w));
      }
  
      tabsContainer.parentNode.replaceChild(tabsContainerClone, tabsContainer);
    });
  }
  
  function renderTitle(session) {
    const title = document.getElementById("title");
    title.addEventListener("dblclick", renameSession);
    title.innerHTML = session;
  }
  
  function activateSearchBar() {
    searchBar.classList.add("active");
    searchBar.focus();
    searchBar.select();
  }
  
  function initializeSearch() {
    searchBar.addEventListener("focus", () => {
      runCommand(`tmux copy-mode -t ${currentSession}`);
    });
    searchBar.addEventListener("blur", () => {
      searchBar.classList.remove("active");
  
      if (!searchBar.value) {
        ipcRenderer.sendSync(input, `q`);
      }
    });
    searchBar.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        ipcRenderer.emit(focus);
        ipcRenderer.sendSync(input, `q`);
      }
    });
    searchBar.addEventListener("keyup", (ev) => {
      if (ev.key === "Enter") {
        ipcRenderer.emit(focus);
        const query = ev.target.value;
        ipcRenderer.sendSync(input, "?");
        ipcRenderer.sendSync(input, query);
        ipcRenderer.sendSync(input, "\x0d");
      }
    });
  }
  
  function renderTitleBar() {
    subscribeToStorageValue(
      "session",
      (session) => {
        currentSession = session;
        renderTitle(session);
        renderTabs();
      },
      { getInitialValue: true },
    );
  
    subscribeToStorageValue("activeWindow", (activeWindow) => {
      runCommand(
        "tmux",
        "select-window",
        "-t",
        `${currentSession}:${activeWindow}`,
      ).then(() => {
        renderTabs();
        activateTab(activeWindow);
        currentWindow = activeWindow;
        ipcRenderer.emit(focus);
      });
    });
  
    titleBar.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        const { x, y } = event;
  
        function handleMove(event) {
          const newX = event.screenX - x;
          const newY = event.screenY - y;
  
          ipcRenderer.send(move, newX, newY);
        }
  
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", () => {
          document.removeEventListener("mousemove", handleMove);
        });
        document.addEventListener("mouseleave", () => {
          document.removeEventListener("mousemove", handleMove);
        });
      }
    });
  }
  
  export function render() {
    createNewTabButton();
    renderTitleBar();
    initializeSearch();
  
    registerShortcut("meta+t", createNewTmuxWindow);
    registerShortcut("meta+w", deleteTmuxWindow);
  
    for (let i = 1; i <= 9; i++) {
      registerShortcut(`meta+${i}`, () => setSelectedWindow(i));
    }
  
    registerShortcut("meta+shift+r", renameSession);
  
    registerShortcut("meta+shift+w", renameWindow);
    registerShortcut("meta+f", activateSearchBar);
  }
  