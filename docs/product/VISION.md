# Suivi Patient Dentaire — Product Vision

**Ambition**  
Become the most clinically intelligent, privacy-respecting, and delightful dental practice software in the world — especially for independent and small-group practices in France, Morocco, and French-speaking countries.

We do not try to be another cloud subscription platform.  
We try to be the software a dentist *trusts* with the most sensitive data of their patients and the most important decisions of their day.

---

## North-star principles

1. **Clinical first**  
   Every pixel and every keystroke must serve the quality of care. Charting, diagnosis, decision support and documentation come before billing and marketing.

2. **Explainable by design**  
   No black-box AI. Every alert, every automatic diagnosis, every recommendation shows the exact data and rule that produced it. The dentist remains the decision-maker.

3. **Privacy as a feature, not a checkbox**  
   Data never leave the workstation by default. AES-256-GCM encryption at rest, key derived from a practice passphrase that is never stored. Offline-first by construction.

4. **Speed at the chair**  
   Keyboard-first, command palette, burst entry for periodontal charting, one-click actions. The software must disappear under the hands of a skilled clinician.

5. **Immutable clinical memory**  
   Every change is an append-only event. The odontogram can be rewound to any past date. Every tooth has a full biography. Audit is not an afterthought; it is the storage model.

6. **Honest economics**  
   One-time license. No forced subscription. Maintenance is optional and transparent. The practice owns its data forever.

---

## Competitive positioning (2026)

| Capability                        | Market leaders (Logos, Julie, Dentrix, Curve…) | Suivi Patient Dentaire          |
|-----------------------------------|------------------------------------------------|---------------------------------|
| Anatomical odontogram             | Rare / approximate                             | **Best-in-class**               |
| Automatic 2018 perio diagnosis    | Partial or missing                             | **Full + reasoning shown**      |
| Immutable journal + time travel   | Rare                                           | **Native**                      |
| Explainable clinical alerts       | Weak or black-box                              | **Deterministic + transparent** |
| True offline + strong encryption  | Rare                                           | **Core architecture**           |
| SESAM-Vitale / e-claims           | Mature                                         | Not yet (roadmap)               |
| Multi-chair real-time sync        | Mature                                         | Limited (offline multi-user)    |
| Patient portal / SMS automation   | Mature                                         | Templates + printable (growing) |
| Lab orders + sterilization log    | Common                                         | **Now present**                 |
| One-time pricing                  | Almost never                                   | **Yes**                         |

We win on clinical intelligence, trust and total cost of ownership.  
We will progressively close the operational gaps without compromising the core principles.

---

## Product pillars

### 1. Anatomical & temporal odontogram
- Real crown proportions and arch geometry
- Surface-level charting with correct orientation
- Full time-travel and per-tooth biography
- Permanent + primary dentition with safety guards

### 2. Periodontal intelligence
- 6-site charting with burst keyboard entry
- Automatic 2018 AAP/EFP staging & grading with explicit criteria
- Longitudinal comparison and risk profiling (CAMBRA-inspired + Lang & Tonetti vectors)

### 3. Explainable decision support
- Safety rules (anticoagulants, antiresorptives, endocarditis, allergies, pregnancy…)
- Clinical gaps (untreated caries, missing crowns on endo teeth…)
- Risk profiles and recommended recall intervals
- Everything is inspectable and overridable

### 4. Operational completeness
- Treatment plans with side-by-side variants and acceptance tracking
- Lab orders (crowns, bridges, night guards, ortho appliances…)
- Sterilization cycle log (regulatory requirement in France)
- Prescriptions with allergy-aware templates
- Agenda with conflict detection
- Billing (France CCAM + Morocco NGAP/TNR)

### 5. Communication & follow-up
- Printable patient materials
- SMS / email / letter templates
- Smart recall engine driven by clinical risk

### 6. Practice intelligence
- Production, collection, acceptance rates, no-show rates
- Unbilled completed acts
- Workload per practitioner
- Command palette for instant navigation

---

## What “world-class” looks like in daily use

- A new patient is charted in under 90 seconds with the anatomical view.
- Periodontal charting is faster than paper because of burst mode and auto-advance.
- The software never surprises the dentist with a silent automatic action.
- Opening an old consultation instantly shows the exact state of the mouth that day.
- A critical safety alert appears with the exact medication and the exact planned act that triggered it.
- The practice can work for a full day with no internet and no anxiety about data loss.
- The total cost of ownership over 5 years is dramatically lower than any cloud competitor.

---

## Roadmap themes (high level)

**Now / Next**
- Lab order module
- Sterilization tracking
- Voice notes (Web Speech API)
- Richer printable documents
- More complete decision rules
- UI polish and keyboard excellence

**Soon**
- Multi-practitioner offline improvements
- Better export / import (structured + PDF)
- Patient-facing materials pack
- Expanded nomenclatures and fee schedules

**Later**
- Optional encrypted sync between chairs (still no central server required)
- SESAM-Vitale bridge (France)
- Advanced imaging tools and AI-assisted annotation (always human-reviewed)

---

*This document is the product north star. Every feature request is measured against these principles.*
