const {
  runCommand,
  storage: { setToStorage, subscribeToStorageValue },
  createDialog,
  closeDialog,
  getSessions,
  registerShortcut,
} = window.api;

const sidebar = document.getElementById("sidebar");
const sessionsContainer = document.createElement("div");
const mainContent = document.getElementsByTagName("main")[0];
const titleBarLeftActions = document.getElementById("title-bar-left-actions");
const title = document.getElementById("title");

sessionsContainer.id = "sessions";

let currentSession;
let previousSession;

function selectPreviousSession() {
  const sessions = sessionsContainer.childNodes;
  let previousSession = sessions[sessions.length - 1].id;

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i].id;

    if (session === currentSession) {
      setToStorage("session", previousSession);
      break;
    }

    previousSession = session;
  }
}

function selectNextSession() {
  const sessions = sessionsContainer.childNodes;
  let nextSession = sessions[0].id;

  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i].id;

    if (session === currentSession) {
      setToStorage("session", nextSession);
      break;
    }

    nextSession = session;
  }
}

function goBack() {
  if (previousSession && currentSession !== previousSession) {
    setToStorage("session", previousSession);
  }
}

function toggleSidebar() {
  sidebar.classList.toggle("hidden");
  title.classList.toggle("no-sidebar");
  titleBarLeftActions.classList.toggle("no-sidebar");
  mainContent.classList.toggle("no-sidebar");
}

function renderShowHideSidebar() {
  const button = document.createElement("button");
  button.classList.add("icon-button", "m", "show-hide-sidebar");

  button.addEventListener("click", toggleSidebar);

  titleBarLeftActions.appendChild(button);
}

function createNewSession() {
  const title = document.createElement("h3");
  title.innerHTML = "Create new session";

  const form = document.createElement("form");
  form.classList.add("flex", "flex-column");

  const sessionNameInput = document.createElement("input");
  sessionNameInput.setAttribute("name", "session-name");
  sessionNameInput.placeholder = "Enter new session name";
  sessionNameInput.required = true;
  form.appendChild(sessionNameInput);

  const button = document.createElement("button");
  button.classList.add("primary");
  button.innerHTML = "Create";
  form.appendChild(button);

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const sessionName = sessionNameInput.value.split(" ").join("_");
    runCommand(`tmux new-session -d -s ${sessionName} -c ~/`).then(() => {
      renderSessions().then(() => {
        setToStorage("session", sessionName);
        closeDialog();
      });
    });
  });

  createDialog(title, form);
  sessionNameInput.focus();
}

function createNewSessionButton() {
  const button = document.createElement("button");
  button.classList.add("icon-button", "m", "create-new-session");

  button.addEventListener("click", createNewSession);

  titleBarLeftActions.appendChild(button);
}

function createCloseSessionButton(sessionName) {
  const button = document.createElement("button");
  button.classList.add("icon-button", "s", "close-button", "close-session");

  button.addEventListener("click", (ev) => {
    ev.stopPropagation();
    runCommand(`tmux kill-session -t ${sessionName}`).then(() => {
      runCommand('tmux display-message -p "#S"').then(({ stdout: output }) => {
        const currentSession = output.toString().trim();
        setToStorage("session", currentSession);
      });
    });
  });

  return button;
}

function createSessionItem(session, { index, selectedSession } = {}) {
  const sessionName = session[1];
  const isAttached = selectedSession === sessionName;

  const button = document.createElement("button");

  const title = document.createElement("span");
  title.innerText = sessionName;
  button.appendChild(title);

  button.setAttribute("id", sessionName);
  button.setAttribute("data-index", index);
  button.classList.add("session-list-item");
  button.appendChild(createCloseSessionButton(sessionName));

  button.addEventListener("click", () => {
    setToStorage("session", sessionName);
    button.classList.add("selected");
  });

  sessionsContainer.appendChild(button);

  if (isAttached) {
    button.classList.add("selected");
  }
}

async function renderSessions(selectedSession) {
  sessionsContainer.innerHTML = "";
  const sessions = await getSessions();

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    createSessionItem(s, { index: i, selectedSession });
  }
}

function renderSideBar() {
  subscribeToStorageValue(
    "session",
    async (session) => {
      if (session) {
        previousSession = currentSession;
        currentSession = session;
        await renderSessions(session);
        sidebar.appendChild(sessionsContainer);
      }
    },
    {
      getInitialValue: true,
    },
  );
}

export async function render() {
  renderSideBar();
  renderShowHideSidebar();
  createNewSessionButton();

  registerShortcut("meta+n", createNewSession);
  registerShortcut("meta+shift+[", selectPreviousSession);
  registerShortcut("meta+shift+]", selectNextSession);
  registerShortcut("meta+shift+p", goBack);
  registerShortcut("meta+s", toggleSidebar);
}
