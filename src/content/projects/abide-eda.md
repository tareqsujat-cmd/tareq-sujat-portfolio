---
title: "ABIDE I & II Exploratory Analysis"
kicker: "Data analysis"
tier: "additional"
order: 5
period: "2026"
summary: "Site-by-site exploration of CC200 ROI time-series across both ABIDE cohorts — the groundwork that shaped the detection framework's evaluation design."
lede: "Understanding the heterogeneity before modelling it."
role: "Sole author."
stack:
  - "Python"
  - "pandas"
  - "NumPy"
  - "Matplotlib"
  - "nilearn"
domains:
  - "Neuroimaging"
  - "Data analysis"
links:
  github: "https://github.com/tareqsujat-cmd/EDA-for-ABIDE-1-and-2"
---

Parsing and profiling preprocessed CC200 parcellation time-series across every
acquisition site in ABIDE I and II — distribution shifts, missingness, per-site
subject counts and signal quality.

This is where the per-site evaluation strategy in the
[ASD detection framework](/work/asd-detection-framework) came from: the site
effects were visible in the raw data long before they showed up in a model.
