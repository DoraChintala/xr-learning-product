// ---------------------------------------------------------------------------
// Seed clinical content — organized as MULTIPLE anatomy modules so the learner
// can choose a body region after logging in. Each module is a competency with
// an ordered skill graph (prereqs gate progression).
//
// The engine is content-agnostic: it consumes whichever module's `skills`
// array is selected. Adding a body region is pure data — no engine changes.
//
// EDUCATIONAL / SYNTHETIC CONTENT ONLY — not medical advice, no patient data.
// ---------------------------------------------------------------------------

export const MODULES = [
  {
    id: 'neuro-preop',
    region: 'Brain',
    icon: '🧠',
    title: 'Pre-Operative Neurosurgical Workflow',
    domain: 'Neurosurgery',
    summary: 'The gated safety sequence before any craniotomy.',
    skills: [
      { id: 'indication', title: 'Diagnosis & surgical indication', prereqs: [], psychomotor: false,
        blurb: 'Confirm the diagnosis and that surgery beats medical management or watchful waiting. Define the goal: cure, debulk, biopsy, or relieve pressure.' },
      { id: 'imaging', title: 'Imaging & anatomical mapping', prereqs: ['indication'], psychomotor: true,
        blurb: 'Build a 3D picture from MRI/CT, angiography, functional MRI (eloquent cortex) and DTI tractography. Locate the lesion relative to what must not be injured.' },
      { id: 'optimization', title: 'Patient assessment & optimization', prereqs: ['indication'], psychomotor: false,
        blurb: 'Neuro baseline (GCS, deficits, cranial nerves); correct coagulation; steroids for edema, antiepileptics; type & crossmatch blood; confirm anesthetic fitness.' },
      { id: 'planning', title: 'Approach, positioning & navigation', prereqs: ['imaging', 'optimization'], psychomotor: true,
        blurb: 'Choose craniotomy site and trajectory, positioning and Mayfield fixation, set up neuronavigation; decide adjuncts: awake mapping, neuromonitoring, 5-ALA fluorescence.' },
      { id: 'consent', title: 'Informed consent & team brief', prereqs: ['planning'], psychomotor: false,
        blurb: 'Disclose risks (bleeding, stroke, infection, seizures, deficit, death), benefits and alternatives. Brief anesthesia, nursing and neuromonitoring on plan and bail-out.' },
      { id: 'timeout', title: 'WHO checklist & surgical time-out', prereqs: ['consent'], psychomotor: false,
        blurb: 'Final safety gate: right patient, right procedure, right side & site (marked), scans displayed. Confirm antibiotics, blood, navigation registration and positioning.' },
    ],
  },
  {
    id: 'cardiac-cath',
    region: 'Heart',
    icon: '❤️',
    title: 'Cardiac Catheterization Readiness',
    domain: 'Interventional Cardiology',
    summary: 'Preparing for a diagnostic/interventional cath procedure.',
    skills: [
      { id: 'indication-c', title: 'Indication & risk stratification', prereqs: [], psychomotor: false,
        blurb: 'Confirm the indication (ischemia, valve assessment) and stratify bleeding/contrast risk before proceeding.' },
      { id: 'access', title: 'Vascular access site selection', prereqs: ['indication-c'], psychomotor: true,
        blurb: 'Choose radial vs femoral access; assess Allen test, pulses and anatomy for safe cannulation.' },
      { id: 'anticoag', title: 'Anticoagulation & contrast planning', prereqs: ['indication-c'], psychomotor: false,
        blurb: 'Plan heparinization, manage renal function and contrast load, review allergies and metformin.' },
      { id: 'catheter', title: 'Catheter handling & coronary engagement', prereqs: ['access', 'anticoag'], psychomotor: true,
        blurb: 'Advance catheters under fluoroscopy and engage the coronary ostia safely.' },
      { id: 'timeout-c', title: 'Pre-procedure time-out', prereqs: ['catheter'], psychomotor: false,
        blurb: 'Confirm patient, procedure, access site, consent, and emergency readiness before starting.' },
    ],
  },
  {
    id: 'airway-basic',
    region: 'Airway',
    icon: '🫁',
    title: 'Basic Airway Management (BVM)',
    domain: 'Emergency / Critical Care',
    summary: 'Bag-valve-mask ventilation fundamentals.',
    skills: [
      { id: 'position', title: 'Head positioning & airway opening', prereqs: [], psychomotor: true,
        blurb: 'Head-tilt/chin-lift and jaw-thrust to open the airway.' },
      { id: 'seal', title: 'Mask seal (C-E grip)', prereqs: ['position'], psychomotor: true,
        blurb: 'Two-point C-E hand position for a leak-free mask seal.' },
      { id: 'ventilate', title: 'Bag-valve ventilation', prereqs: ['position', 'seal'], psychomotor: true,
        blurb: 'Deliver measured breaths at the correct rate and volume.' },
      { id: 'troubleshoot', title: 'Troubleshooting poor ventilation', prereqs: ['ventilate'], psychomotor: true,
        blurb: 'Recognize and correct an inadequate seal or obstruction.' },
    ],
  },
];

export function getModule(id) {
  return MODULES.find((m) => m.id === id) || null;
}
