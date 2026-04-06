let rolesData = [];
let resumeSkills = [];
let resumeText = "";

/* Tracking dataset */
let trackingDataset = JSON.parse(localStorage.getItem("trackingData")) || [];

/* Load roles */
fetch("roles.json")
  .then((res) => {
    if (!res.ok) {
      throw new Error("Failed to load roles.json");
    }
    return res.json();
  })
  .then((data) => {
    rolesData = data;
  })
  .catch((error) => {
    console.error("Error loading roles:", error);
    alert("Could not load roles data. Please check roles.json");
  });

function analyzeResume() {
  const resume = document.getElementById("resumeFile").files[0];

  if (!resume) {
    alert("Please upload a resume first");
    return;
  }

  if (!rolesData.length) {
    alert("Roles data is still loading. Please try again in a moment.");
    return;
  }

  extractResume(resume);
}

/* ---------- Resume Reading ---------- */

function extractResume(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "txt") {
    readTXT(file);
  } else if (ext === "pdf") {
    readPDF(file);
  } else if (ext === "docx") {
    readDOCX(file);
  } else {
    alert("Unsupported file format. Please upload TXT, PDF, or DOCX.");
  }
}

function readTXT(file) {
  const reader = new FileReader();
  reader.onload = (e) => processResume(e.target.result);
  reader.onerror = () => alert("Error reading TXT file");
  reader.readAsText(file);
}

function readPDF(file) {
  const reader = new FileReader();

  reader.onload = function () {
    pdfjsLib
      .getDocument(new Uint8Array(this.result))
      .promise.then((pdf) => {
        let text = "";
        let tasks = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          tasks.push(
            pdf.getPage(i).then((page) =>
              page.getTextContent().then((content) => {
                content.items.forEach((item) => {
                  text += item.str + " ";
                });
              })
            )
          );
        }

        Promise.all(tasks).then(() => processResume(text));
      })
      .catch(() => {
        alert("Error reading PDF file");
      });
  };

  reader.onerror = () => alert("Error reading PDF file");
  reader.readAsArrayBuffer(file);
}

function readDOCX(file) {
  const reader = new FileReader();

  reader.onload = () => {
    mammoth
      .extractRawText({ arrayBuffer: reader.result })
      .then((result) => processResume(result.value))
      .catch(() => {
        alert("Error reading DOCX file");
      });
  };

  reader.onerror = () => alert("Error reading DOCX file");
  reader.readAsArrayBuffer(file);
}

/* ---------- NLP PERSONAL DETAILS ---------- */

function extractEmail(text) {
  return (
    text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/)?.[0] ||
    "Not Found"
  );
}

function extractPhone(text) {
  const mobileRegex = /(\+91[\s-]?)?[6-9]\d{9}/g;
  return text.match(mobileRegex)?.[0] || "Not Found";
}

function extractName(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let line of lines.slice(0, 10)) {
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(line)) {
      return line;
    }
  }

  return "Not Found";
}

function extractGitHub(text) {
  const match = text.match(/github\.com\/[A-Za-z0-9_-]+/i);
  return match ? "https://" + match[0] : "Not Found";
}

function extractLinkedIn(text) {
  const match = text.match(/linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
  return match ? "https://" + match[0] : "Not Found";
}

/* ---------- SKILL EXTRACTION ---------- */

function extractSkills(text) {
  const skills = [
    "html",
    "css",
    "javascript",
    "react",
    "bootstrap",
    "git",
    "python",
    "sql",
    "excel",
    "powerbi",
    "figma",
    "wireframe",
    "prototype",
    "ui",
    "ux",
    "java",
    "node",
    "mongodb",
    "aws"
  ];

  const lowerText = text.toLowerCase();
  return skills.filter((skill) => lowerText.includes(skill));
}

/* ---------- MAIN PROCESS ---------- */

function processResume(text) {
  resumeText = text;

  const name = extractName(text);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const github = extractGitHub(text);
  const linkedin = extractLinkedIn(text);

  document.getElementById("personal").innerHTML = `
    <div class="profile-card">
      <h2>${name}</h2>
      <p class="subtitle">Aspiring Software Engineer</p>
      <div class="info-grid">
        <span>📞 ${phone}</span>
        <span>📧 ${email}</span>
        <span>🔗 ${
          github !== "Not Found"
            ? `<a href="${github}" target="_blank">GitHub</a>`
            : "GitHub Not Found"
        }</span>
        <span>💼 ${
          linkedin !== "Not Found"
            ? `<a href="${linkedin}" target="_blank">LinkedIn</a>`
            : "LinkedIn Not Found"
        }</span>
      </div>
    </div>
  `;

  resumeSkills = extractSkills(text);

  document.getElementById("skills").innerHTML = resumeSkills.length
    ? resumeSkills.join(", ")
    : "No skills found";

  detectRoleAndScore(name, email, phone);
}

/* ---------- ROLE + SCORE ---------- */

function detectRoleAndScore(name, email, phone) {
  let bestRole = "Not Matched";
  let bestMatch = 0;

  rolesData.forEach((role) => {
    const matched = role.skills.filter((skill) => resumeSkills.includes(skill));
    const percent = Math.round((matched.length / role.skills.length) * 100);

    if (percent > bestMatch) {
      bestMatch = percent;
      bestRole = role.role;
    }
  });

  const score = Math.min(100, bestMatch + resumeSkills.length * 2);

  const status =
    bestMatch >= 80
      ? "Strong Match"
      : bestMatch >= 60
      ? "Good Match"
      : "Needs Improvement";

  const candidateData = {
    candidateId: "C" + (trackingDataset.length + 1).toString().padStart(3, "0"),
    name,
    email,
    phone,
    role: bestRole,
    match: bestMatch,
    score,
    status
  };

  const existingIndex = trackingDataset.findIndex(
    (item) => item.email === email && email !== "Not Found"
  );

  if (existingIndex !== -1) {
    trackingDataset[existingIndex] = {
      ...trackingDataset[existingIndex],
      ...candidateData
    };
  } else {
    trackingDataset.push(candidateData);
  }

  localStorage.setItem("trackingData", JSON.stringify(trackingDataset));

  document.getElementById("role").innerHTML = bestRole;
  document.getElementById("match").innerHTML = bestMatch + "%";
  document.getElementById("score").innerHTML = score + "/100";
}
