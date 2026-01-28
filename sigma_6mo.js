// Prototype 2 covariance matrix placeholder (Σ) for 6-month model.
//
// Expected shape when provided:
//   window.PROTOTYPE2_SIGMA_6MO = {
//     predictors: [ ... predictor names in exact same order as model_beta_6m.csv ... ],
//     sigma: [[...], [...], ...]  // NxN covariance matrix in same order
//   }
//
// Until you provide Σ, keep this null; the UI will show point estimates only.
window.PROTOTYPE2_SIGMA_6MO = null;
