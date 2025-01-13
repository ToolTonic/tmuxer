import * as titleBar from "./titleBar.js";
import * as sideBar from "./sideBar.js";
import * as switchSessions from "./switchSessions.js";

const {
  ipcRenderer,
  terminal,
  runCommand,
  storage: { setToStorage, subscribeToStorageValue },
  events
} = window.api;

const cssModule = await import('./style.css', {
  assert: { type: 'css' }
});
document.adoptedStyleSheets = [cssModule.default];

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

await titleBar.render();
await sideBar.render();
switchSessions.init();
