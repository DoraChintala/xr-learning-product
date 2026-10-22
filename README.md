# XR Learning Product — AI-Personalized AR/VR Learning for Healthcare Professionals

An adaptive learning platform that personalizes **immersive AR/VR clinical
training** and measures competency over time. Built browser-first on **WebXR**,
with graceful fallback from VR → AR → desktop-3D → quiz so it runs anywhere —
no headset or app-store install required.

## Why it matters

Clinical competence decays, procedural skills need hands-on practice, and senior
educator time is scarce. XR Learning Product models each learner's mastery, routes them to the
activity and modality that grows that mastery fastest, and schedules reviews to
fight the forgetting curve — turning training from "attendance" into measurable,
retained competence.

## The AI inside

XR Learning Product combines three deterministic, inspectable models in the live learning loop
(no black-box generative model makes real-time clinical decisions):

| Component | Technique | Role |
|---|---|---|
| **Mastery estimation** | Bayesian Knowledge Tracing (HMM) | P(skill mastered) from noisy attempts |
| **Modality selection** | UCB1 multi-armed bandit (RL) | Learns which of VR/AR/3D/quiz grows mastery fastest |
| **Review scheduling** | SM-2 spaced repetition | Schedules reviews against the forgetting curve |

Generative AI is used **offline and human-verified** for content authoring only.

## Architecture

```
src/
├── engine/     Framework-free AI core (BKT, UCB1 bandit, SM-2)
├── client/     WebXR UI + mastery dashboard (three.js)
└── server/     Node API: learning-turn endpoint + persistence
test/           Engine unit tests
```

The engine is pure and dependency-free, so every learning/clinical decision is
unit-testable in isolation.

## Getting started

```bash
npm install
npm test          # run the engine unit tests
npm start         # start the API/dev server
```

## Status

Early development. Current focus: adaptive engine + a vertical-slice demo around
one clinical competency (basic airway management / bag-valve-mask ventilation).

## License

MIT
