// Load covariance matrices (Σ) from CSV files
// Parses model_vcov_6m.csv and model_vcov_12m.csv and populates window.PROTOTYPE2_SIGMA_6MO and window.PROTOTYPE2_SIGMA_12MO

(function () {
  "use strict";

  /**
   * Parse CSV line handling quoted strings.
   * Splits by commas but respects quoted strings.
   */
  function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim()); // Add last field
    
    return result;
  }

  /**
   * Parse covariance matrix CSV.
   * Format: First row is header with predictor names, first column is predictor names, rest are numeric values.
   * Returns { predictors: string[], sigma: number[][] }
   */
  function parseVcovCsv(csvText) {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    
    if (lines.length < 2) throw new Error("Covariance CSV appears empty");
    
    // Parse header row to get predictor names (skip first empty column)
    const headerFields = parseCsvLine(lines[0]);
    // First field should be empty (it's the row name column header)
    if (headerFields.length === 0) {
      throw new Error("Invalid covariance CSV header: no fields found");
    }
    
    // Extract predictor names from header (remove quotes)
    const predictorNames = headerFields.slice(1).map(field => {
      // Remove surrounding quotes if present
      const match = field.match(/^"(.+)"$/);
      return match ? match[1] : field;
    });
    
    if (predictorNames.length === 0) throw new Error("No predictors found in covariance CSV header");
    
    // Parse data rows
    const n = predictorNames.length;
    const sigma = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const fields = parseCsvLine(line);
      
      if (fields.length < n + 1) {
        throw new Error(`Row ${i + 1} has ${fields.length} fields but expected ${n + 1}`);
      }
      
      // Skip first column (predictor name), parse rest as numbers
      const row = [];
      for (let j = 1; j <= n; j++) {
        const val = Number(fields[j]);
        if (!Number.isFinite(val)) {
          throw new Error(`Invalid value in covariance CSV row ${i + 1}, column ${j + 1}: "${fields[j]}"`);
        }
        row.push(val);
      }
      
      sigma.push(row);
    }
    
    if (sigma.length !== n) {
      throw new Error(`Covariance matrix has ${sigma.length} rows but expected ${n}`);
    }
    
    return { predictors: predictorNames, sigma };
  }

  async function fetchTextMaybe(url) {
    if (typeof fetch !== "function") return null;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  async function loadSigma6m() {
    const csv = await fetchTextMaybe("model_vcov_6m.csv");
    if (!csv) {
      console.warn("Could not load model_vcov_6m.csv, standard errors will not be available");
      return null;
    }
    try {
      const parsed = parseVcovCsv(csv);
      window.PROTOTYPE2_SIGMA_6MO = parsed;
      console.log("Loaded 6-month covariance matrix:", parsed.predictors.length, "predictors");
      return parsed;
    } catch (e) {
      console.error("Error parsing model_vcov_6m.csv:", e);
      return null;
    }
  }

  async function loadSigma12m() {
    const csv = await fetchTextMaybe("model_vcov_12m.csv");
    if (!csv) {
      console.warn("Could not load model_vcov_12m.csv, standard errors will not be available");
      return null;
    }
    try {
      const parsed = parseVcovCsv(csv);
      window.PROTOTYPE2_SIGMA_12MO = parsed;
      console.log("Loaded 12-month covariance matrix:", parsed.predictors.length, "predictors");
      return parsed;
    } catch (e) {
      console.error("Error parsing model_vcov_12m.csv:", e);
      return null;
    }
  }

  // Export functions for manual loading
  window.LoadSigma = {
    loadSigma6m,
    loadSigma12m,
  };

  // Load both matrices when script runs
  // This will populate window.PROTOTYPE2_SIGMA_6MO and window.PROTOTYPE2_SIGMA_12MO
  (async () => {
    try {
      await Promise.all([loadSigma6m(), loadSigma12m()]);
      // Dispatch event when loading is complete
      window.dispatchEvent(new CustomEvent('sigmaLoaded'));
    } catch (e) {
      console.error("Error loading covariance matrices:", e);
      window.dispatchEvent(new CustomEvent('sigmaLoadError', { detail: e }));
    }
  })();
})();
