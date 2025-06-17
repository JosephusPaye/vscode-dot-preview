const vscode = acquireVsCodeApi();

function getSettings() {
  const element = document.getElementById("preview-settings");
  if (element) {
    const data = element.getAttribute("data-settings");
    if (data) {
      return JSON.parse(data);
    }
  }

  throw new Error(`Could not load settings`);
}

const output = document.getElementById("output");
if (!output) {
  console.error("Could not find #output element");
}

function log(...args: unknown[]) {
  console.log(...args);

  if (!output) {
    return;
  }

  output.textContent += args.map((a) => JSON.stringify(a, null, 2)).join(" ") + "\n";
}

window.addEventListener("load", () => {
  const settings = getSettings();
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const initialState = vscode.getState() || {};

  setTimeout(() => {
    document.body.classList.remove("loading");
    log("Initialized");
    log(settings);
    log("isMac", isMac);
    log("initialState", initialState);
  }, 5000);
});

window.addEventListener("message", (e) => {
  if (e.origin !== window.origin) {
    console.error("Dropping message from unknown origin in dot svg preview");
    return;
  }

  switch (e.data.type) {
    case "setScale": {
      log("setScale", e.data.scale);
      break;
    }
    case "setActive": {
      log("setActive", e.data.value);
      break;
    }
    case "zoomIn": {
      log("zoomIn");
      break;
    }
    case "zoomOut": {
      log("zoomOut");
      break;
    }
    case "copyImage": {
      log("copyImage");
      break;
    }
  }
});
