(() => {
  "use strict";

  const integrations = {
    spring: { type: "spring", path: "/actuator" },
    quarkus: { type: "quarkus", path: "/q/metrics" },
    "statlite-metrics": { type: "statlite-metrics", path: "/statlite/metrics" }
  };

  const elements = {
    builder: document.querySelector("#builder-flow"),
    inspect: document.querySelector("#inspect-flow"),
    name: document.querySelector("#app-name"),
    host: document.querySelector("#host"),
    port: document.querySelector("#port"),
    https: document.querySelector("#https"),
    output: document.querySelector("#yaml-output"),
    frameworkGuides: document.querySelector("#framework-guides"),
    copyStatus: document.querySelector("#copy-status")
  };

  const selectedValue = (name) => document.querySelector(`input[name="${name}"]:checked`).value;

  const yamlScalar = (value) => {
    const cleaned = value.trim();
    if (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(cleaned)) return cleaned;
    return JSON.stringify(cleaned || "my-app");
  };

  const urlHost = (value) => {
    const host = value.trim() || "localhost";
    if (host.includes(":") && !(host.startsWith("[") && host.endsWith("]"))) {
      return `[${host}]`;
    }
    return host;
  };

  const buildUrl = (integration) => {
    const scheme = elements.https.checked ? "https" : "http";
    const host = urlHost(elements.host.value);
    const port = elements.port.value.trim() || "8080";
    return `${scheme}://${host}:${port}${integrations[integration].path}`;
  };

  const updateYaml = () => {
    const integration = selectedValue("integration");
    if (integration === "inspect") return;
    const target = integrations[integration];
    elements.output.textContent = `server:
  listen: 127.0.0.1:9090

storage:
  sqlite_path: ./statlite.sqlite

polling:
  interval: 30s

targets:
  - name: ${yamlScalar(elements.name.value)}
    type: ${target.type}
    url: ${buildUrl(integration)}
`;
  };

  const updateIntegration = () => {
    const integration = selectedValue("integration");
    const isInspect = integration === "inspect";
    elements.builder.hidden = isInspect;
    elements.inspect.hidden = !isInspect;
    elements.frameworkGuides.hidden = integration !== "statlite-metrics";
    updateYaml();
  };

  let statusTimer;
  const copyText = async (text, button) => {
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (_) {
      // Fall through to the legacy copy path.
    }

    if (!copied) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      try {
        copied = document.execCommand("copy");
      } catch (_) {
        copied = false;
      }
      area.remove();
    }

    const label = button.querySelector(".copy-label");
    const copiedItem = button.dataset.defaultLabel.replace("Copy", "").trim();
    if (copied) {
      label.textContent = "Copied";
      elements.copyStatus.textContent = `${copiedItem[0].toUpperCase()}${copiedItem.slice(1)} copied to clipboard.`;
      elements.copyStatus.classList.remove("error");
    } else {
      label.textContent = "Copy failed";
      elements.copyStatus.textContent = "Could not copy automatically. Select the text and copy it manually.";
      elements.copyStatus.classList.add("error");
    }
    elements.copyStatus.classList.add("visible");
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      label.textContent = button.dataset.defaultLabel;
      elements.copyStatus.classList.remove("visible");
      elements.copyStatus.classList.remove("error");
    }, 1800);
  };

  document.querySelectorAll('input[name="integration"]').forEach((input) => {
    input.addEventListener("change", updateIntegration);
  });
  [elements.name, elements.host, elements.port].forEach((input) => input.addEventListener("input", updateYaml));
  elements.https.addEventListener("change", updateYaml);
  document.querySelector("#copy-config").addEventListener("click", (event) => copyText(elements.output.textContent, event.currentTarget));
  document.querySelector("#copy-command").addEventListener("click", (event) => copyText(document.querySelector("#inspect-command").textContent, event.currentTarget));

  updateIntegration();
})();
