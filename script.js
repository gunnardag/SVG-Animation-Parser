const svg = document.getElementById("drawingArea");
let drawing = false;
let currentPath = null;
const inputField = document.getElementById("pathsInput");
const clearButton = document.getElementById("clearDrawingBtn");

function getSvgPoint(event) {
  const rect = svg.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 200;
  const y = ((event.clientY - rect.top) / rect.height) * 200;
  return {
    x: Math.max(0, Math.min(200, x)),
    y: Math.max(0, Math.min(200, y)),
  };
}

function updateInputFromDrawing() {
  if (!svg || !inputField) return;
  const rawSvg = svg.outerHTML;
  const formatted = rawSvg.replace(/></g, ">\n<").trim();
  inputField.value = formatted;
}

if (clearButton) {
  clearButton.addEventListener("click", () => {
    svg.innerHTML = "";
    currentPath = null;
    drawing = false;
    updateInputFromDrawing();
  });
}

svg.addEventListener("mousedown", (e) => {
  drawing = true;
  const { x, y } = getSvgPoint(e);

  currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  currentPath.setAttribute("d", `M${x} ${y}`);
  currentPath.setAttribute("stroke", "black");
  currentPath.setAttribute("fill", "none");
  currentPath.setAttribute("stroke-width", "2");

  svg.appendChild(currentPath);
});

svg.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const { x, y } = getSvgPoint(e);

  let d = currentPath.getAttribute("d");
  d += ` L${x} ${y}`;
  currentPath.setAttribute("d", d);
});

svg.addEventListener("mouseup", () => {
  drawing = false;
  currentPath = null;
  updateInputFromDrawing();
});

svg.addEventListener("mouseleave", () => {
  drawing = false;
  currentPath = null;
  updateInputFromDrawing();
});

document.getElementById("generateBtn").addEventListener("click", () => {
  const svg = document.getElementById("svgCanvas");
  svg.innerHTML = "";

  const input = document.getElementById("pathsInput").value.trim();
  if (!input) return;

  const parser = new DOMParser();
  let paths = [];
  if (/<svg[\s>]/i.test(input)) {
    const doc = parser.parseFromString(input, "image/svg+xml");
    paths = Array.from(doc.querySelectorAll("path"));
  } else {
    const pathStrings = input.split(/\n+/);
    paths = pathStrings
      .map((line) => {
        const doc = parser.parseFromString(
          `<svg>${line}</svg>`,
          "image/svg+xml"
        );
        return doc.querySelector("path");
      })
      .filter(Boolean);
  }

  paths.forEach((parsed, i) => {
    const imported = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    for (const attr of parsed.attributes) {
      imported.setAttribute(attr.name, attr.value);
    }

    svg.appendChild(imported);

    if (typeof imported.getTotalLength !== "function") return;
    const length = imported.getTotalLength();

    imported.setAttribute("stroke-dasharray", length);
    imported.setAttribute("stroke-dashoffset", length);
    imported.setAttribute("stroke-width", "2");
    imported.setAttribute("fill", "none");
    imported.setAttribute("stroke", "currentColor");

    const anim = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "animate"
    );
    anim.setAttribute("attributeName", "stroke-dashoffset");
    anim.setAttribute("from", length.toString());
    anim.setAttribute("to", "0");
    anim.setAttribute("dur", "0.25s");
    anim.setAttribute("fill", "freeze");
    anim.setAttribute("id", `b_anim${i + 1}`);
    anim.setAttribute("begin", i === 0 ? "0s" : `b_anim${i}.end`);

    imported.appendChild(anim);

    if (typeof anim.beginElement !== "function") {
      anim.remove();
      imported.animate(
        [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
        {
          duration: 250,
          delay: i * 250,
          fill: "forwards",
          easing: "linear",
        }
      );
    }
  });

  const firstAnim = svg.querySelector("animate");
  if (firstAnim && typeof firstAnim.beginElement === "function") {
    firstAnim.beginElement();
  }

  function formatXml(xml) {
    return xml.replace(/></g, ">\n<").trim();
  }

  const rawSvg = svg.outerHTML;
  const svgMarkup = formatXml(rawSvg);
  document.getElementById("svgOutput").textContent = svgMarkup;
});

document.getElementById("generateSmoothBtn").addEventListener("click", () => {
  const svg = document.getElementById("svgCanvas");
  svg.innerHTML = "";

  const input = document.getElementById("pathsInput").value.trim();
  if (!input) return;

  const parser = new DOMParser();
  let paths = [];
  if (/<svg[\s>]/i.test(input)) {
    const doc = parser.parseFromString(input, "image/svg+xml");
    paths = Array.from(doc.querySelectorAll("path"));
  } else {
    const pathStrings = input.split(/\n+/);
    paths = pathStrings
      .map((line) => {
        const doc = parser.parseFromString(
          `<svg>${line}</svg>`,
          "image/svg+xml"
        );
        return doc.querySelector("path");
      })
      .filter(Boolean);
  }

  const curveSamplesInput = document.getElementById("curveSamples");
  const windowSizeInput = document.getElementById("windowSize");
  const curveSamples = Number.parseInt(curveSamplesInput?.value, 10) || 25;
  const windowSize = Number.parseInt(windowSizeInput?.value, 10) || 8;

  paths.forEach((parsed, i) => {
    const imported = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    for (const attr of parsed.attributes) {
      if (attr.name == "d") {
        imported.setAttribute(
          attr.name,
          smoothSvgPath(attr.value, {
            curveSamples,
            windowSize,
          })
        );
      } else {
        imported.setAttribute(attr.name, attr.value);
      }
    }

    svg.appendChild(imported);

    if (typeof imported.getTotalLength !== "function") return;
    const length = imported.getTotalLength();

    imported.setAttribute("stroke-dasharray", length);
    imported.setAttribute("stroke-dashoffset", length);
    imported.setAttribute("stroke-width", "2");
    imported.setAttribute("fill", "none");
    imported.setAttribute("stroke", "currentColor");

    const anim = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "animate"
    );
    anim.setAttribute("attributeName", "stroke-dashoffset");
    anim.setAttribute("from", length.toString());
    anim.setAttribute("to", "0");
    anim.setAttribute("dur", "0.25s");
    anim.setAttribute("fill", "freeze");
    anim.setAttribute("id", `b_anim${i + 1}`);
    anim.setAttribute("begin", i === 0 ? "0s" : `b_anim${i}.end`);

    imported.appendChild(anim);

    if (typeof anim.beginElement !== "function") {
      anim.remove();
      imported.animate(
        [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
        {
          duration: 250,
          delay: i * 250,
          fill: "forwards",
          easing: "linear",
        }
      );
    }
  });

  const firstAnim = svg.querySelector("animate");
  if (firstAnim && typeof firstAnim.beginElement === "function") {
    firstAnim.beginElement();
  }

  function formatXml(xml) {
    return xml.replace(/></g, ">\n<").trim();
  }

  const rawSvg = svg.outerHTML;
  const svgMarkup = formatXml(rawSvg);
  document.getElementById("svgOutput").textContent = svgMarkup;
});

const copyButton = document.getElementById("copySvgBtn");
if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const svgOutput = document.getElementById("svgOutput");
    const text = svgOutput ? svgOutput.textContent.trim() : "";
    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      copyButton.classList.add("copied");
      copyButton.setAttribute("aria-label", "Copied");
      window.setTimeout(() => {
        copyButton.classList.remove("copied");
        copyButton.setAttribute("aria-label", "Copy SVG");
      }, 300);
    } catch (error) {
      console.error("Copy failed", error);
    }
  });
}

function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x:
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x,
    y:
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y,
  };
}

function flattenSvgPath(d, curveSamples = 20) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g);
  if (!tokens) return [];

  let i = 0;
  let x = 0,
    y = 0;
  const points = [];

  while (i < tokens.length) {
    const cmd = tokens[i++];

    // Absolute move / line
    if (cmd === "M" || cmd === "L") {
      x = parseFloat(tokens[i++]);
      y = parseFloat(tokens[i++]);
      points.push({ x, y });
    }

    // Relative move
    else if (cmd === "m") {
      x += parseFloat(tokens[i++]);
      y += parseFloat(tokens[i++]);
      points.push({ x, y });
    }

    // Cubic Bézier (relative)
    else if (cmd === "c") {
      while (i + 5 < tokens.length && !isNaN(tokens[i])) {
        const p0 = { x, y };
        const p1 = {
          x: x + parseFloat(tokens[i++]),
          y: y + parseFloat(tokens[i++]),
        };
        const p2 = {
          x: x + parseFloat(tokens[i++]),
          y: y + parseFloat(tokens[i++]),
        };
        const p3 = {
          x: x + parseFloat(tokens[i++]),
          y: y + parseFloat(tokens[i++]),
        };

        for (let s = 1; s <= curveSamples; s++) {
          const t = s / curveSamples;
          points.push(cubicBezier(p0, p1, p2, p3, t));
        }

        x = p3.x;
        y = p3.y;
      }
    }
  }

  return points;
}

function movingAverage(points, windowSize = 7) {
  const half = Math.floor(windowSize / 2);

  return points.map((_, i) => {
    let sx = 0,
      sy = 0,
      c = 0;

    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < points.length) {
        sx += points[j].x;
        sy += points[j].y;
        c++;
      }
    }

    return { x: sx / c, y: sy / c };
  });
}

function pointsToPath(points) {
  if (!points.length) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  return d;
}

function smoothSvgPath(d, { curveSamples = 25, windowSize = 7 } = {}) {
  const points = flattenSvgPath(d, curveSamples);
  const smooth = movingAverage(points, windowSize);
  return pointsToPath(smooth);
}
