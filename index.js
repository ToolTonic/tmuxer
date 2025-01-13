import * as sideBar from "./sideBar.js";
import * as titleBar from "./titleBar.js";
import * as sessionSwitcher from "./sessionSwitcher.js";

const {
  ipcRenderer,
  terminal,
  runCommand,
  storage: { setToStorage, subscribeToStorageValue },
  events
} = window.api;

subscribeToStorageValue(
  "session",
  (sessionName) => {
    if (sessionName) {
      runCommand(
        `tmux display-message  -t ${sessionName} -p '#{window_index}'`,
      ).then(({ stdout }) => {
        const windowId = parseInt(stdout.toString());
        runCommand(`tmux switchc -t ${sessionName}:${windowId}`);
      });
    } else {
      ipcRenderer.send(events.terminal.input, "tmux a \x0d");
      runCommand(`tmux display-message -p '#S'`).then(({ stdout }) => {
        const sessionName = stdout.toString().trim();
        setToStorage("session", sessionName);
      });
    }
    terminal.focus();
  },
  { getInitialValue: true },
);

sideBar.render();
titleBar.render();
sessionSwitcher.init();
