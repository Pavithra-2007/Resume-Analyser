let rolesData = [];
let resumeSkills = [];
let resumeText = "";

/* Tracking dataset */
let trackingDataset =
    JSON.parse(localStorage.getItem("trackingData")) || [];

/* Load roles */
fetch("roles.json")
    .then(res => res.json())
    .then(data => rolesData = data);

function analyzeResume() {
    const resume = document.getElementById("resumeFile").files[0];
    if (!resume) return alert("Upload resume");
    extractResume(resume);
}

/* ---------- Resume Reading ---------- */

function extractResume(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === "txt") readTXT(file);
    else if (ext === "pdf") readPDF(file);
    else if (ext === "docx") readDOCX(file);
}

function readTXT(file) {
    const reader = new FileReader();
    reader.onload = e => processResume(e.target.result);
    reader.readAsText(file);
}

function readPDF(file) {
    const reader = new FileReader();
    reader.onload = function () {
        pdfjsLib.getDocument(new Uint8Array(this.result)).promise.then(pdf => {
            let text = "", tasks = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                tasks.push(
                    pdf.getPage(i).then(p =>
                        p.getTextContent().then(c =>
                            c.items.forEach(i => text += i.str + " ")
                        )
                    )
                );
            }
            Promise.all(tasks).then(() => processResume(text));
        });
    };
    reader.readAsArrayBuffer(file);
}

function readDOCX(file) {
    const reader = new FileReader();
    reader.onload = () =>
        mammoth.extractRawText({ arrayBuffer: reader.result })
            .then(r => processResume(r.value));
    reader.readAsArrayBuffer(file);
}

/* ---------- NLP PERSONAL DETAILS ---------- */

function extractEmail(text) {
    return (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/) || ["Not found"])[0];
}

function extractPhone(text) {
    const mobileRegex = /(\+91[\s-]?)?[6-9]\d{9}/g;
const mobile = text.match(mobileRegex)?.[0] || "Not Found";
    return mobile;
}

/* 🔥 NLP NAME DETECTION */
function extractName(text) {
    const nameRegex = /^[A-Z][a-z]+(\s[A-Z][a-z]+)+/m;
const name = text.match(nameRegex)?.[0] || "Not Found";

    return name;
}
function extractGitHub(text) {
    const match = text.match(/github\.com\/[A-Za-z0-9_-]+/i);
    return match ? "https://" + match[0] : "Not found";
}

function extractLinkedIn(text) {
    const match = text.match(/linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
    return match ? "https://" + match[0] : "Not found";
}


/* ---------- SKILL EXTRACTION ---------- */

function extractSkills(text) {
    const skills = [
        "html","css","javascript","react","bootstrap","git",
        "python","sql","excel","powerbi",
        "figma","wireframe","prototype","ui","ux",
        "java","node","mongodb","aws"
    ];
    return skills.filter(s => text.toLowerCase().includes(s));
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
                <span>🔗 <a href="${github}" target="_blank">GitHub</a></span>
                <span>💼 <a href="${linkedin}" target="_blank">LinkedIn</a></span>
            </div>
        </div>
    `;

    resumeSkills = extractSkills(text);
    document.getElementById("skills").innerHTML =
        resumeSkills.length ? resumeSkills.join(", ") : "No skills found";

    detectRoleAndScore(name, email, phone);
}


/* ---------- ROLE + SCORE ---------- */

function detectRoleAndScore(name, email, phone) {
    let bestRole = "Not Matched";
    let bestMatch = 0;

    rolesData.forEach(role => {
        let matched = role.skills.filter(s => resumeSkills.includes(s));
        let percent = Math.round((matched.length / role.skills.length) * 100);
        if (percent > bestMatch) {
            bestMatch = percent;
            bestRole = role.role;
        }
    });

    let score = Math.min(100, bestMatch + resumeSkills.length * 2);
    let status = bestMatch >= 80 ? "Strong Match" :
                 bestMatch >= 60 ? "Good Match" : "Needs Improvement";

    trackingDataset.push({
        candidateId: "C" + (trackingDataset.length + 1).toString().padStart(3, "0"),
        name, email, phone,
        role: bestRole,
        match: bestMatch,
        score, status
    });

    localStorage.setItem("trackingData", JSON.stringify(trackingDataset));

    document.getElementById("role").innerHTML = bestRole;
    document.getElementById("match").innerHTML = bestMatch + "%";
    document.getElementById("score").innerHTML = score + "/100";
}
