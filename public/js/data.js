/* ============================================================
   HealthBridge AI — Static Data
   Symptom knowledge base, emergency numbers, chatbot intents.
   Sources: WHO general guidance, public first-aid guidelines.
   ============================================================ */

/* ---------- Symptom knowledge base ----------
   Keyed by lowercase symptom token. Each entry includes
   conditions (common possibilities), advice, and severity.
*/
window.SYMPTOM_DB = {
  fever: {
    conditions: ["Viral infection", "Flu", "COVID-19", "Bacterial infection"],
    advice: ["Rest and stay hydrated", "Use a damp cloth on forehead", "Take paracetamol if needed", "See a doctor if fever lasts more than 3 days or exceeds 39°C"],
    severity: "medium"
  },
  headache: {
    conditions: ["Tension headache", "Migraine", "Dehydration", "Eye strain"],
    advice: ["Drink water and rest in a dark, quiet room", "Apply a cool compress", "Limit screen time", "Seek care for sudden severe headaches"],
    severity: "low"
  },
  cough: {
    conditions: ["Common cold", "Allergies", "Bronchitis", "COVID-19"],
    advice: ["Stay hydrated and use warm fluids", "Honey may soothe the throat", "Avoid smoke and irritants", "See a doctor if cough lasts >2 weeks or has blood"],
    severity: "low"
  },
  "sore throat": {
    conditions: ["Viral pharyngitis", "Strep throat", "Allergies"],
    advice: ["Gargle warm salt water", "Drink warm fluids", "Use throat lozenges", "Visit a doctor if accompanied by high fever"],
    severity: "low"
  },
  fatigue: {
    conditions: ["Sleep deprivation", "Stress", "Anemia", "Thyroid issues"],
    advice: ["Aim for 7–9 hours of sleep", "Eat balanced meals with iron", "Light exercise can help energy", "Consult a doctor if persistent"],
    severity: "low"
  },
  stress: {
    conditions: ["Acute stress", "Burnout", "Anxiety"],
    advice: ["Try slow breathing (4-7-8 technique)", "Go for a 10-minute walk outside", "Limit caffeine", "Talk to someone you trust"],
    severity: "low"
  },
  anxiety: {
    conditions: ["Generalized anxiety", "Panic response", "Stress overload"],
    advice: ["Ground yourself: name 5 things you see", "Practice deep breathing", "Reduce stimulants", "Reach out to a mental-health professional"],
    severity: "medium"
  },
  nausea: {
    conditions: ["Indigestion", "Food intolerance", "Motion sickness", "Migraine"],
    advice: ["Sip ginger tea or clear fluids", "Eat small bland meals (toast, rice)", "Avoid strong smells", "See a doctor if vomiting persists"],
    severity: "low"
  },
  chest_pain: {
    conditions: ["Muscle strain", "Heartburn", "Anxiety", "Possible cardiac event"],
    advice: ["Stop activity and sit down", "If pain spreads to arm/jaw or with shortness of breath — call emergency services immediately"],
    severity: "high"
  },
  shortness_of_breath: {
    conditions: ["Asthma", "Anxiety", "Respiratory infection", "Cardiac issue"],
    advice: ["Sit upright and breathe slowly", "Use prescribed inhaler if available", "Seek urgent care if severe or sudden"],
    severity: "high"
  }
};

/* ---------- Emergency numbers by region ---------- */
window.EMERGENCY_NUMBERS = {
  IN: [
    { label: "All-in-one Emergency", num: "112", icon: "siren" },
    { label: "Ambulance", num: "102", icon: "ambulance" },
    { label: "Police", num: "100", icon: "shield" },
    { label: "Fire", num: "101", icon: "flame" },
    { label: "Women Helpline", num: "1091", icon: "user" },
  ],
  US: [
    { label: "Emergency", num: "911", icon: "siren" },
    { label: "Poison Control", num: "1-800-222-1222", icon: "flask-conical" },
    { label: "Suicide & Crisis", num: "988", icon: "heart" },
  ],
  UK: [
    { label: "Emergency", num: "999", icon: "siren" },
    { label: "Non-emergency NHS", num: "111", icon: "stethoscope" },
  ],
  EU: [
    { label: "Emergency (EU)", num: "112", icon: "siren" },
  ],
  AU: [
    { label: "Emergency", num: "000", icon: "siren" },
    { label: "Health Direct", num: "1800-022-222", icon: "stethoscope" },
  ],
  CA: [
    { label: "Emergency", num: "911", icon: "siren" },
    { label: "Health Link", num: "811", icon: "stethoscope" },
  ],
};

/* ---------- Chatbot intents (keyword -> response) ---------- */
window.CHAT_INTENTS = [
  { keys: ["hi", "hello", "hey"], reply: "Hi there! 👋 I'm your HealthBridge assistant. Ask me about stress, sleep, hydration, exercise, or any general wellness topic." },
  { keys: ["stress", "stressed", "overwhelm"], reply: "Stress is tough. Try the 4-7-8 breathing technique: inhale 4s, hold 7s, exhale 8s. Repeat 4 times. A short walk outside also helps reset your nervous system. 🌿" },
  { keys: ["anxiety", "anxious", "panic"], reply: "When anxiety spikes, ground yourself: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. Slow your breath, you're safe in this moment. 💙" },
  { keys: ["sleep", "insomnia", "tired"], reply: "For better sleep: avoid screens 30 min before bed, dim the lights, and keep the room cool (~18°C). Try a consistent bedtime even on weekends. 😴" },
  { keys: ["water", "hydrat"], reply: "Aim for ~2 litres of water daily (more if active or in heat). Drink a glass on waking up — it kickstarts your metabolism. 💧" },
  { keys: ["headache", "migraine"], reply: "Headaches are often dehydration or eye strain. Drink water, rest your eyes for 10 min, and try a cool compress on your forehead. If severe or sudden, please see a doctor." },
  { keys: ["fever", "temperature"], reply: "Stay hydrated, rest, and dress lightly. Paracetamol can help. If fever exceeds 39°C or lasts more than 3 days — please consult a doctor. 🌡️" },
  { keys: ["exercise", "workout", "fit"], reply: "Even 20 minutes of brisk walking 5x a week reduces risk of heart disease. Start small — consistency beats intensity. 🚶‍♂️" },
  { keys: ["diet", "nutrition", "eat"], reply: "Build meals around half a plate of vegetables, a quarter lean protein, and a quarter whole grains. Keep snacks simple: fruit, nuts, yogurt. 🥗" },
  { keys: ["meditat", "mindful"], reply: "Try a 5-minute body scan: close your eyes, breathe slowly, notice each part of your body from head to toe. Even brief practice rewires the brain over time. 🧘" },
  { keys: ["emergency", "urgent", "ambulance"], reply: "If this is a life-threatening emergency, please call your local emergency number immediately (112 / 911 / 999). The Emergency section has quick-dial cards for your country." },
  { keys: ["medicine", "drug", "pill"], reply: "Use the Medicine Explorer above to search real label info from openFDA. Never self-medicate — always confirm with a healthcare professional." },
  { keys: ["thank", "thanks"], reply: "You're very welcome! Take care of yourself today. 💙" },
];

/* Default reply when no intent matches */
window.CHAT_DEFAULT = "I want to help! Try asking about stress, sleep, hydration, exercise, headache, or wellness habits. For medical concerns, please consult a qualified professional.";
