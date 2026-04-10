export const POSITIONS_QUERY = `(() => {
  const button = document.getElementById("positions");
  if (button) button.click();
  const page = [...document.querySelectorAll(".page-vCXUCd2i")]
    .find((el) => el.className.includes("active-vCXUCd2i"));
  const table = page ? page.querySelector("table.positions, .ka-table.positions") : null;
  const scope = table || page;
  const headers = scope
    ? [...scope.querySelectorAll("thead th")]
        .map((th) => (th.innerText || "").trim())
        .filter(Boolean)
    : [];
  const rows = scope
    ? [...scope.querySelectorAll("tr.ka-tr")]
        .map((tr) => [...tr.querySelectorAll("td")].map((td) => (td.innerText || "").trim()))
        .filter((row) => row.some(Boolean))
    : [];
  return { headers, rows };
})()`;

export const ORDERS_QUERY = `(() => {
  const button = document.getElementById("orders");
  if (button) button.click();
  const page = [...document.querySelectorAll(".page-vCXUCd2i")]
    .find((el) => el.className.includes("active-vCXUCd2i"));
  const table = page ? page.querySelector("table.orders, .ka-table.orders") : null;
  const scope = table || page;
  const headers = scope
    ? [...scope.querySelectorAll("thead th")]
        .map((th) => (th.innerText || "").trim())
        .filter(Boolean)
    : [];
  const rows = scope
    ? [...scope.querySelectorAll("tr.ka-tr")]
        .map((tr) => [...tr.querySelectorAll("td")].map((td) => (td.innerText || "").trim()))
        .filter((row) => row.some(Boolean))
    : [];
  return { headers, rows };
})()`;

export const ORDER_HISTORY_QUERY = `(() => {
  const button = document.getElementById("history");
  if (button) button.click();
  const page = [...document.querySelectorAll(".page-vCXUCd2i")]
    .find((el) => el.className.includes("active-vCXUCd2i"));
  const table = page ? page.querySelector("table.orders, .ka-table.orders") : null;
  const scope = table || page;
  const headers = scope
    ? [...scope.querySelectorAll("thead th")]
        .map((th) => (th.innerText || "").trim())
        .filter(Boolean)
    : [];
  const rows = scope
    ? [...scope.querySelectorAll("tr.ka-tr")]
        .map((tr) => [...tr.querySelectorAll("td")].map((td) => (td.innerText || "").trim()))
        .filter((row) => row.some(Boolean))
    : [];
  return { headers, rows };
})()`;

export const ACCOUNT_SUMMARY_QUERY = `(() => {
  const root = [...document.querySelectorAll(".accountManager-vCXUCd2i")][0];
  if (!root) return null;
  const text = root.innerText || "";
  const labels = [
    "Account balance",
    "Equity",
    "Realized P&L",
    "Unrealized P&L",
    "Account margin",
    "Available funds",
    "Orders margin",
    "Margin buffer",
  ];
  const allLines = text.split("\\n").map((line) => line.trim()).filter(Boolean);
  const cutIndex = allLines.indexOf("Positions");
  const lines = cutIndex === -1 ? allLines : allLines.slice(0, cutIndex);
  const values = {};
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (labels.includes(line)) {
      let value = "";
      for (let j = i + 1; j < lines.length; j += 1) {
        if (labels.includes(lines[j])) break;
        value = lines[j];
        if (value) break;
      }
      values[line] = value;
    }
  }
  return values;
})()`;

export function closePositionMenuQuery(symbol) {
  return `(() => {
    const button = document.getElementById("positions");
    if (button) button.click();
    const page = [...document.querySelectorAll(".page-vCXUCd2i")]
      .find((el) => el.className.includes("active-vCXUCd2i"));
    const table = page ? page.querySelector("table.positions, .ka-table.positions") : null;
    const scope = table || page || document;
    const row = [...scope.querySelectorAll("tr.ka-tr")]
      .find((tr) => (tr.innerText || "").includes(${JSON.stringify(symbol)}));
    if (!row) return { ok: false, stage: "row_not_found" };
    const rowCloseButton = [...row.querySelectorAll("button")]
      .find((node) => {
        const label = (node.getAttribute("title") || node.getAttribute("aria-label") || "").trim();
        return label === "Close";
      });
    if (!rowCloseButton) return { ok: false, stage: "row_close_button_not_found" };
    rowCloseButton.click();
    const confirmAlreadyVisible = [...document.querySelectorAll("button")]
      .find((node) => {
        const text = (node.innerText || node.textContent || "").trim().toLowerCase();
        return text === "close position" && node.offsetParent;
      });
    if (confirmAlreadyVisible) {
      return { ok: true, stage: "close_dialog_opened" };
    }
    const action = [...document.querySelectorAll("button,div,span")]
      .find((node) => {
        const text = (node.innerText || node.textContent || "").trim();
        return text === "Close Position" && node.offsetParent;
      });
    if (!action) return { ok: false, stage: "close_action_not_found" };
    action.click();
    return { ok: true, stage: "close_dialog_opened" };
  })()`;
}

export const CONFIRM_CLOSE_POSITION_QUERY = `(() => {
  const button = [...document.querySelectorAll("button")]
    .find((node) => {
      const text = (node.innerText || node.textContent || "").trim().toLowerCase();
      return text === "close position" && node.offsetParent;
    });
  if (!button) return { ok: false, stage: "confirm_button_not_found" };
  button.click();
  return { ok: true, stage: "close_confirmed" };
})()`;

export function cancelOrderQuery(identifier) {
  return `(() => {
    const button = document.getElementById("orders");
    if (button) button.click();
    const page = [...document.querySelectorAll(".page-vCXUCd2i")]
      .find((el) => el.className.includes("active-vCXUCd2i"));
    const table = page ? page.querySelector("table.orders, .ka-table.orders") : null;
    const scope = table || page || document;
    const row = [...scope.querySelectorAll("tr.ka-tr")]
      .find((tr) => (tr.innerText || "").includes(${JSON.stringify(identifier)}));
    if (!row) return { ok: false, stage: "row_not_found" };
    const cancelButton = [...row.querySelectorAll("button")]
      .find((node) => {
        const label = (node.getAttribute("title") || node.getAttribute("aria-label") || "").trim();
        return label === "Cancel";
      });
    if (!cancelButton) return { ok: false, stage: "cancel_button_not_found" };
    cancelButton.click();
    const confirmButton = [...document.querySelectorAll("button")]
      .find((node) => {
        const text = (node.innerText || node.textContent || "").trim().toLowerCase();
        const cls = typeof node.className === "string" ? node.className : "";
        return (
          text === "cancel order" &&
          node.offsetParent &&
          (cls.includes("submitButton") || cls.includes("primary"))
        );
      });
    if (!confirmButton) return { ok: false, stage: "cancel_confirm_not_found" };
    confirmButton.click();
    return { ok: true, stage: "cancel_confirmed", identifier: ${JSON.stringify(identifier)} };
  })()`;
}
