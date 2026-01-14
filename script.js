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
            curveSamples: 25,
            windowSize: 75,
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

function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x:
      mt ** 3 * p0.x +
      3 * mt ** 2 * t * p1.x +
      3 * mt * t ** 2 * p2.x +
      t ** 3 * p3.x,
    y:
      mt ** 3 * p0.y +
      3 * mt ** 2 * t * p1.y +
      3 * mt * t ** 2 * p2.y +
      t ** 3 * p3.y,
  };
}

function flattenSvgPath(path, segmentsPerCurve = 20) {
  const tokens = path.match(/[a-zA-Z]|-?\d*\.?\d+/g);
  const points = [];

  let i = 0;
  let x = 0,
    y = 0;

  while (i < tokens.length) {
    const cmd = tokens[i++];

    if (cmd === "m") {
      x += parseFloat(tokens[i++]);
      y += parseFloat(tokens[i++]);
      points.push({ x, y });
    } else if (cmd === "c") {
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

        for (let t = 0; t <= 1; t += 1 / segmentsPerCurve) {
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

function smoothSvgPath(path, { curveSamples = 20, windowSize = 7 } = {}) {
  const rawPoints = flattenSvgPath(path, curveSamples);
  const smoothPoints = movingAverage(rawPoints, windowSize);
  return pointsToPath(smoothPoints);
}
