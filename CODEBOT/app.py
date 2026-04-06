import json
from pathlib import Path

import pandas as pd
import streamlit as st

st.set_page_config(
    page_title="CODEBOT – Dashboard",
    page_icon="📊",
    layout="wide",
)

DATA_FILE = Path("tracking_data.json")


def load_data() -> list[dict]:
    if not DATA_FILE.exists():
        return [
            {
                "candidateId": "C001",
                "name": "Pavithra",
                "email": "pavithra@example.com",
                "phone": "9876543210",
                "role": "Python Developer",
                "match": 88,
                "score": 9.1,
                "status": "Shortlisted",
            },
            {
                "candidateId": "C002",
                "name": "Arun",
                "email": "arun@example.com",
                "phone": "9876501234",
                "role": "Frontend Developer",
                "match": 76,
                "score": 8.0,
                "status": "Under Review",
            },
            {
                "candidateId": "C003",
                "name": "Meena",
                "email": "meena@example.com",
                "phone": "9123456780",
                "role": "Data Analyst",
                "match": 93,
                "score": 9.5,
                "status": "Selected",
            },
        ]

    with open(DATA_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        return []

    return data


def save_data(data: list[dict]) -> None:
    with open(DATA_FILE, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


data = load_data()
df = pd.DataFrame(data)

st.markdown(
    """
    <style>
        .main-title {
            font-size: 2.2rem;
            font-weight: 700;
            margin-bottom: 0.2rem;
        }
        .sub-text {
            color: #666;
            margin-bottom: 1rem;
        }
        .metric-box {
            padding: 1rem;
            border-radius: 16px;
            background: linear-gradient(135deg, #eef2ff, #f8fbff);
            border: 1px solid #e5e7eb;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="main-title">📊 Resume Tracking Dashboard</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-text">Track candidate details, scores, match percentage, and status.</div>',
    unsafe_allow_html=True,
)

if df.empty:
    st.warning("No tracking data found.")
else:
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Candidates", len(df))

    with col2:
        shortlisted = (df["status"].astype(str).str.lower() == "shortlisted").sum()
        st.metric("Shortlisted", int(shortlisted))

    with col3:
        selected = (df["status"].astype(str).str.lower() == "selected").sum()
        st.metric("Selected", int(selected))

    with col4:
        avg_match = pd.to_numeric(df["match"], errors="coerce").fillna(0).mean()
        st.metric("Average Match", f"{avg_match:.1f}%")

    st.divider()

    left, right = st.columns([2, 1])

    with left:
        role_filter = st.selectbox(
            "Filter by Role",
            ["All"] + sorted(df["role"].astype(str).unique().tolist()),
        )

    with right:
        status_filter = st.selectbox(
            "Filter by Status",
            ["All"] + sorted(df["status"].astype(str).unique().tolist()),
        )

    filtered_df = df.copy()

    if role_filter != "All":
        filtered_df = filtered_df[filtered_df["role"] == role_filter]

    if status_filter != "All":
        filtered_df = filtered_df[filtered_df["status"] == status_filter]

    st.dataframe(
        filtered_df,
        use_container_width=True,
        hide_index=True,
    )

st.divider()
st.subheader("➕ Add New Candidate")

with st.form("candidate_form", clear_on_submit=True):
    c1, c2 = st.columns(2)
    with c1:
        candidate_id = st.text_input("Candidate ID")
        name = st.text_input("Name")
        email = st.text_input("Email")
        phone = st.text_input("Phone")

    with c2:
        role = st.text_input("Role")
        match = st.number_input("Match %", min_value=0, max_value=100, value=75)
        score = st.number_input("Score", min_value=0.0, max_value=10.0, value=7.5, step=0.1)
        status = st.selectbox(
            "Status",
            ["Under Review", "Shortlisted", "Selected", "Rejected"],
        )

    submitted = st.form_submit_button("Save Candidate")

    if submitted:
        new_item = {
            "candidateId": candidate_id.strip(),
            "name": name.strip(),
            "email": email.strip(),
            "phone": phone.strip(),
            "role": role.strip(),
            "match": int(match),
            "score": float(score),
            "status": status,
        }

        data.append(new_item)
        save_data(data)
        st.success("Candidate added successfully. Refresh or rerun to see updated data.")
