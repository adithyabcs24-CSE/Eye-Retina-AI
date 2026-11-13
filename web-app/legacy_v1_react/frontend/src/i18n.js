import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// MEDICAL_REVIEW_REQUIRED: Any translated medical or clinical text must be reviewed
// by a qualified medical expert before international release.
const resources = {
  en: {
    translation: {
      app: {
        title: "Ophthalmic & Systemic Biomarker Research Prototype",
        disclaimer: "Research prototype. Not a medical diagnosis.",
        notice: "Notice: Research Prototype. Not a Medical Diagnosis."
      },
      nav: {
        home: "Home / Overview",
        workbench: "Workbench",
        modelCard: "Model Card",
        metrics: "Metrics Dashboard",
        researcher: "Researcher Portal"
      },
      tooltips: {
        sensitivity: "Sensitivity (True Positive Rate): The proportion of actual positive cases correctly identified by the model. High sensitivity minimizes missed cases.",
        specificity: "Specificity (True Negative Rate): The proportion of actual negative cases correctly identified. High specificity minimizes false alarms.",
        roc_auc: "ROC-AUC: Area under the Receiver Operating Characteristic curve. Measures discriminative ability across all classification thresholds (0.5 = random, 1.0 = perfect).",
        pr_auc: "PR-AUC: Area under the Precision-Recall curve. Particularly informative for rare conditions with class imbalance.",
        calibration: "Calibration / Reliability: Measures how closely predicted probabilities reflect true empirical event frequencies (e.g. if model predicts 70%, 70 of 100 cases should be positive).",
        bland_altman: "Bland-Altman Agreement: A graphical method to evaluate the agreement between two quantitative measurements by plotting difference against mean with 95% limits of agreement.",
        optical_horizon: "Optical Horizon: The physical boundary of what an anterior camera can observe. External cameras cannot image posterior retinal structures directly."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

