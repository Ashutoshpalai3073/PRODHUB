// src/data.js
// Seed data for Sanyog — the innovation-procurement pathway.
//
// Field semantics changed with the pivot from the old investor marketplace; the
// SHAPE is unchanged so nothing downstream breaks:
//   fundingGoal -> pilot budget sought for the challenge (₹)
//   raised      -> milestone payments released so far (₹)
//   pitchScore  -> FitScore™ (solution-to-challenge fit, 0–100)
//   stage       -> procurement stage; MUST match STAGE_ORDER and the
//                  `startups.stage` column. See migration 018.
//
// Pilot budgets are anchored to the real Maharashtra Startup Week work-order
// ceiling (₹15 lakh under the 2018 GR, raised to ₹25 lakh by the Maharashtra
// Startup, Entrepreneurship and Innovation Policy 2025, §13.7).

export const initialStartups = [
  {
    id: "st-1",
    name: "JalRakshak Systems",
    tagline: "Acoustic leak detection for municipal water networks.",
    description:
      "Clamp-on acoustic sensors on distribution mains localise leaks above 5 litres/min within 3 hours, cutting non-revenue water loss. Founder is an ex-water-infrastructure engineer with 9 years in SCADA. Revenue is a per-sensor annual subscription plus a leak-detection SLA.",
    stage: "Validated",
    industry: "WaterTech",
    founder: "Ashutosh Palai",
    fundingGoal: 2500000,
    raised: 1750000,
    metrics: { members: 6, pitchScore: 87 },
  },
  {
    id: "st-2",
    name: "TransitIQ",
    tagline: "Live occupancy and schedule adherence for public bus fleets.",
    description:
      "Retrofit GPS and passenger-counting telemetry gives depot managers live occupancy, bunching alerts and schedule adherence without replacing existing ticketing hardware. Piloted across 60 buses on 4 depot routes.",
    stage: "In Pilot",
    industry: "Mobility",
    founder: "Kabir Sen",
    fundingGoal: 1500000,
    raised: 450000,
    metrics: { members: 4, pitchScore: 78 },
  },
  {
    id: "st-3",
    name: "AarogyaTrack",
    tagline: "AI-assisted chest X-ray triage for tuberculosis screening.",
    description:
      "Computer-aided detection running on handheld X-ray units flags presumptive TB at the point of screening, prioritising confirmatory testing in high-burden blocks. Validated against radiologist-read ground truth on district screening camps.",
    stage: "Scaled",
    industry: "HealthTech",
    founder: "Meera Iyer",
    fundingGoal: 2500000,
    raised: 2500000,
    metrics: { members: 8, pitchScore: 91 },
  },
  {
    id: "st-4",
    name: "FasalSetu",
    tagline: "Crop advisory and mandi price intelligence for smallholders.",
    description:
      "Vernacular voice advisory over low-end phones combines local weather, soil-card data and mandi arrival prices so smallholders can time sowing and sale decisions. Built for districts with patchy data connectivity.",
    stage: "Applied",
    industry: "AgriTech",
    founder: "Chetan Sharma",
    fundingGoal: 1500000,
    raised: 0,
    metrics: { members: 3, pitchScore: 69 },
  },
];

export const upcomingEvents = [
  {
    id: "ev-1",
    title: "Maharashtra Innovation Challenge — Demo Day",
    date: "June 15, 2026",
    time: "10:00 AM IST",
    type: "Demo Day",
    location: "Yashwantrao Chavan Centre, Mumbai",
    description:
      "Shortlisted startups demonstrate working solutions against live departmental challenge statements, in front of nodal officers and the evaluation panel. Outcomes feed directly into pilot work orders.",
  },
  {
    id: "ev-2",
    title: "Challenge Briefing — Urban Water Loss",
    date: "June 28, 2026",
    time: "03:30 PM IST",
    type: "Panel Discussion",
    location: "Online · MS Teams",
    description:
      "Open briefing on the non-revenue water challenge: baseline figures, sandbox boundaries, data-sharing protocol and the security clearance checklist. Applicants may put questions to the department directly.",
  },
];
