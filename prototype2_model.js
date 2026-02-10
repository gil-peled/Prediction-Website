// Prototype 2 model utilities
// - Loads β from model_beta_6m.csv and model_beta_12m.csv (fetch when served over http)
// - Fallbacks to embedded CSV when opened via file:// (where fetch typically fails)
// - Builds X in exact predictor order and evaluates logit probability (+ optional CI if Σ provided)
// - Supports both 6-month and 12-month models
//
// Public API (attached to window):
//   - window.Prototype2Model.loadModel6m()
//   - window.Prototype2Model.loadModel12m()
//   - window.Prototype2Model.buildPredictorsFromForm(formValues)
//   - window.Prototype2Model.evaluate(formValues, { sigma6m, sigma12m })

(function () {
  "use strict";

  /** Embedded fallback snapshot of model_beta_6m.csv */
  const EMBEDDED_BETA_6M_CSV = `"","Estimate","Std. Error","z value","Pr(>|z|)"
"(Intercept)",-1.10196891737914,3.04245406150904,-0.362197389048683,0.717204530531785
"age",0.022898902787632,0.00400565356647545,5.71664583759314,0.0000000108647228465572
"age2",-0.016990521722024,0.00516637827041096,-3.28867164437661,0.00100661384767351
"age3",-0.00790890564491775,0.00326170383366938,-2.42477737042738,0.015317777037177
"sexF",0.0482777490557924,0.0189489480003034,2.54777991131853,0.0108410842338478
"hcc_date_init1",0.732944106947686,0.0486043025144366,15.0798194610443,0.0000000000000000000000000000000000000000000000000021986934997204
"sodium_lab_miss1",-5.85988543016074,3.00713410967172,-1.94866115592046,0.0513359035219402
"sodium_lab",-0.0398599587525891,0.0227137583288627,-1.75488169661198,0.0792795455626817
"sodium_lab2",0.00982291343705088,0.0250923102293629,0.391471066125915,0.695449071557219
"creat_lab_miss1",-0.280049862247,0.173089602408802,-1.61794734258838,0.105673946286587
"creat_lab",-1.0177760936083,0.30481208339895,-3.33902804068366,0.000840720773777525
"creat_lab2",1.26886747610458,0.333475854153959,3.80497556359438,0.000141818190924097
"creat_lab3",-0.051121444211706,0.098047517201658,-0.52139458163497,0.602091925246796
"platelet_lab_miss1",-0.823071353656441,0.100142165978871,-8.21902887371236,0.000000000000000205157649932108
"platelet_lab",-0.00663280717230829,0.00104269994091717,-6.36118495074813,0.000000000200203199361829
"platelet_lab2",0.00379627002903422,0.00116187959348898,3.26735235760058,0.0010855847357297
"platelet_lab3",0.00388172287422922,0.000771902086300376,5.02877624393244,0.000000493619994245345
"albumin_lab_miss1",-0.22059921396755,0.0812314567995133,-2.71568703380525,0.00661384067594555
"albumin_lab",-0.130049684103737,0.0198261812930163,-6.55949232894115,0.0000000000539912707910141
"albumin_lab2",-0.20253885749975,0.117601263205059,-1.72225069680235,0.0850241147287262
"inr_lab_miss1",3.24488879382859,0.422135582257148,7.68684027173985,0.0000000000000150813224985085
"inr_lab",2.99702998180266,0.38435672314711,7.79752194071955,0.00000000000000631346631038654
"inr_lab2",-2.96355005794429,0.4739386382005,-6.25302479915249,0.000000000402578182180618
"inr_lab3",-0.131511767235182,0.19576264414791,-0.671791943798111,0.501716158184907
"bilirubin_lab_miss1",0.743173178685896,0.0767427921326826,9.68394761296937,0.000000000000000000000352823359562588
"bilirubin_lab",0.755953311779231,0.0435223359869656,17.3693184117146,0.000000000000000000000000000000000000000000000000000000000000000000140889526431684
"bilirubin_lab3",-0.736531853529996,0.0469699938096076,-15.6809016521382,0.000000000000000000000000000000000000000000000000000000204332958585475
"myocardial_date_init1",0.0136579259200248,0.0349733901018274,0.390523363055706,0.696149582817904
"heart_fail_date_init1",0.288125380567253,0.0253804569296621,11.3522534825022,0.00000000000000000000000000000722755733547809
"periph_date_init1",-0.0385756333574724,0.0249435385430584,-1.54651808086017,0.121979496832755
"cerebro_date_init1",0.0010017433431079,0.0286161255926679,0.0350062533750051,0.972074754458775
"dementia_date_init1",0.187460340344926,0.0450338513842625,4.16265397212809,0.0000314569885030302
"pulmonary_date_init1",0.00597011516898096,0.0209062071859653,0.285566631760389,0.775210063600044
"rheumatic_date_init1",0.010546953222242,0.0382336161113194,0.275855498248818,0.782659055356809
"ulcer_date_init1",0.0700208115736498,0.0481089930986736,1.45546200540997,0.145541401407944
"diab_unc_date_init1",0.00934076900325068,0.0221026487873889,0.422608579320151,0.672580866075429
"paralysis_date_init1",0.16530059249298,0.0652750934604981,2.53236853031874,0.0113294846616368
"diab_com_date_init1",0.0721019254430862,0.0264730924628127,2.72359285355004,0.00645760602695227
"malignancy_date_init1",0.0822273119998842,0.0289939815310557,2.83601311919889,0.00456805695203965
"meta_cancer_date_init1",0.304961585109867,0.0511482584704863,5.96230632731781,0.00000000248702344513226
"aids_date_init1",0.68299355145078,0.276443033662557,2.47064844572818,0.0134868330537716
"renal_mild_date_init1",0.0610694659884265,0.0280076099936264,2.1804597394181,0.0292234000632049
"renal_severe_date_init1",0.319835049632873,0.0435010610258563,7.35235054250215,0.000000000000194751244315817
"etiology_m0nALD",0.43163390478459,0.0505271453051566,8.54261411717909,0.0000000000000000131219009636912
"etiology_m0nMETALD",0.485741835343745,0.027030710454614,17.9699988337092,0.00000000000000000000000000000000000000000000000000000000000000000000000334721798074952
"etiology_m0nHCV",-0.00598537051741443,0.0294854077774757,-0.202994327315586,0.839139466056908
"etiology_m0nHBV",-0.370030806521471,0.0847044919767967,-4.36849094877796,0.0000125108001281587
"etiology_m0nBiliary",-0.426193100858598,0.047768342284573,-8.92208271159201,0.000000000000000000457600271459055
"etiology_m0nOther",-0.0904539445861985,0.0596721811421405,-1.51584780135211,0.129557841794578
"etiology_m0n2+ Etiologies",0.0332484628668433,0.0344635189557108,0.964743702161439,0.334673200177432
"etiology_m0nUnknown",0.00772360309341266,0.060820225561867,0.126990701235663,0.898947758301904`;

  /** Embedded fallback snapshot of model_beta_12m.csv */
  const EMBEDDED_BETA_12M_CSV = `"","Estimate","Std. Error","z value","Pr(>|z|)"
"(Intercept)",-0.877823347502642,2.64290690827215,-0.332143120423615,0.73978119115517
"age",0.0181432993937503,0.00288832040971026,6.28160896995852,0.000000000335086801320098
"age2",-0.00948918544657135,0.00377950208635423,-2.51069723729793,0.0120492989260189
"age3",-0.0105934809917979,0.00250763591734223,-4.22448925640913,0.0000239483275425995
"sexF",0.0392108980308773,0.014425196146306,2.71822286734857,0.00656336124569896
"hcc_date_init1",0.649029537641356,0.0423812407125694,15.3140759149334,0.0000000000000000000000000000000000000000000000000000615808668648982
"sodium_lab_miss1",-5.47865377217551,2.61925389057465,-2.09168488472628,0.0364667135213493
"sodium_lab",-0.0380317498882854,0.0197696615603483,-1.92374309353707,0.0543867935610812
"sodium_lab2",0.0207757574363096,0.0215152639432496,0.965628750412235,0.334229983580088
"creat_lab_miss1",-0.340109405564527,0.138362316273817,-2.45810719799932,0.0139671475924725
"creat_lab",-0.853391790061945,0.243943860189547,-3.49831223216214,0.000468212646006789
"creat_lab2",0.980763121236289,0.265407340575221,3.69531271859575,0.00021961631291674
"creat_lab3",0.0808012268775091,0.0769253089955488,1.0503854704332,0.293540923080113
"platelet_lab_miss1",-0.767566248186793,0.082618306688332,-9.29051052912943,0.000000000000000000015355002470144
"platelet_lab",-0.00560902937367135,0.00086069411833532,-6.51686732159835,0.0000000000717908721220936
"platelet_lab2",0.00264120254485255,0.000947039161676036,2.78890530796872,0.00528865256323295
"platelet_lab3",0.00486303020412701,0.000581137007465208,8.36813030603312,0.0000000000000000585396385312498
"albumin_lab_miss1",-0.178001423835489,0.0624196280399281,-2.85168991589675,0.00434874997373917
"albumin_lab",-0.160632589418661,0.0155622881725848,-10.3219133097431,0.000000000000000000000000560940323971024
"albumin_lab2",-0.00253088989227079,0.0843755536864838,-0.0299955352195362,0.976070613948703
"inr_lab_miss1",3.82178831382665,0.32344118210525,11.8160225885614,0.0000000000000000000000000000000322599624232614
"inr_lab",3.54270074302757,0.29580306713048,11.9765517558507,0.00000000000000000000000000000000471531575350632
"inr_lab2",-3.61949057643175,0.367263927533085,-9.85528472873418,0.000000000000000000000065032108519418
"inr_lab3",0.0130877385634017,0.152693123977711,0.0857126910659851,0.93169481324677
"bilirubin_lab_miss1",0.627432038551513,0.057626201949379,10.8879644558681,0.00000000000000000000000000131547609030542
"bilirubin_lab",0.67421940214477,0.0336632741919744,20.0283370625163,0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000031190032302814
"bilirubin_lab3",-0.663424277696803,0.0368209523113631,-18.0175752133403,0.00000000000000000000000000000000000000000000000000000000000000000000000141824805310356
"myocardial_date_init1",0.0131522025046188,0.0268771874421627,0.489344449932535,0.624597856760438
"heart_fail_date_init1",0.254759922810426,0.0193838587828909,13.1428899510601,0.00000000000000000000000000000000000000186948035855921
"periph_date_init1",-0.0836853035664817,0.0188808179391258,-4.43229227866578,0.000009323651094847
"cerebro_date_init1",0.006641496531596,0.0216427874849982,0.306868814204251,0.758943227195988
"dementia_date_init1",0.129027451559417,0.0358522777118459,3.59886344171415,0.000319610953874779
"pulmonary_date_init1",-0.0387108984369807,0.015740387146031,-2.4593358522787,0.0139194334442082
"rheumatic_date_init1",-0.0322251814100153,0.0288859311602316,-1.11560126731801,0.264592849409062
"ulcer_date_init1",0.103979396844528,0.0359810608119105,2.88983688913665,0.00385441761903928
"diab_unc_date_init1",0.00882544908983442,0.0167789193199579,0.525984357010219,0.598899075788484
"paralysis_date_init1",0.048536908130639,0.0527363620127078,0.920368912041053,0.357380008619269
"diab_com_date_init1",0.14653829065643,0.0201687386928553,7.26561501381047,0.000000000000371344811956596
"malignancy_date_init1",-0.000338684232688443,0.0224183101552518,-0.0151074826935206,0.987946431317771
"meta_cancer_date_init1",0.17907396570682,0.0439559769737001,4.07393892789516,0.0000462246079374736
"aids_date_init1",0.793686176909597,0.210198703414164,3.77588521726398,0.000159440405616964
"renal_mild_date_init1",0.000970022785832393,0.0213859197093251,0.0453580112062904,0.963821948722269
"renal_severe_date_init1",0.29999764853545,0.0346633972038909,8.65459455029341,0.00000000000000000494666962914175
"etiology_m0nALD",0.414606881342819,0.039845628809493,10.4053291096272,0.000000000000000000000000234444567382362
"etiology_m0nMETALD",0.470246691247908,0.0209322749645645,22.4651497290176,0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000910046908755446
"etiology_m0nHCV",-0.0815345567295807,0.0224205944314422,-3.63659210637334,0.000276268885001141
"etiology_m0nHBV",-0.358874049445587,0.0621096024299275,-5.77807674506484,0.00000000755593440617654
"etiology_m0nBiliary",-0.459130321181678,0.0349740081982329,-13.1277581505478,0.00000000000000000000000000000000000000228316039889726
"etiology_m0nOther",-0.0143242239676469,0.0430257450491567,-0.33292215977391,0.739193041633016
"etiology_m0n2+ Etiologies",-0.0637971526295027,0.0264497260793195,-2.41201562686066,0.0158646015468816
"etiology_m0nUnknown",-0.0460956524565379,0.0460172560876663,-1.00170362980188,0.31648675307245`;

  /** @type {{ predictors: string[], betas: number[] } | null} */
  let cachedModel6m = null;
  /** @type {{ predictors: string[], betas: number[] } | null} */
  let cachedModel12m = null;
  /** @type {Promise<{ predictors: string[], betas: number[] }>|null} */
  let inflight6m = null;
  /** @type {Promise<{ predictors: string[], betas: number[] }>|null} */
  let inflight12m = null;
  /** @type {Map<string, string> | null} */
  let predictorNameMap = null;
  /** @type {Promise<Map<string, string>> | null} */
  let inflightNameMap = null;

  /**
   * Parse CSV with quoted strings and multiple columns.
   * Extracts predictor name from first column (removing quotes) and Estimate from second column.
   */
  function parseBetaCsv(csvText) {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) throw new Error("β CSV appears empty");
    
    // First line is header, skip it
    const predictors = [];
    const betas = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Parse CSV line with quoted strings
      // Format: "predictor_name",estimate,std_error,...
      const match = line.match(/^"([^"]+)",([^,]+)/);
      if (!match) continue;
      
      const name = match[1].trim();
      const betaStr = match[2].trim();
      const beta = Number(betaStr);
      
      if (!name) continue;
      if (!Number.isFinite(beta)) {
        throw new Error(`Invalid beta for predictor "${name}": "${betaStr}"`);
      }
      predictors.push(name);
      betas.push(beta);
    }
    
    if (predictors.length === 0) throw new Error("No predictors parsed from β CSV");
    return { predictors, betas };
  }

  async function fetchTextMaybe(url) {
    // Avoid throwing if fetch is blocked (e.g. file://)
    if (typeof fetch !== "function") return null;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  async function loadModel6m() {
    if (cachedModel6m) return cachedModel6m;
    if (inflight6m) return inflight6m;
    inflight6m = (async () => {
      const csv = (await fetchTextMaybe("model_beta_6m.csv")) ?? EMBEDDED_BETA_6M_CSV;
      const model = parseBetaCsv(csv);
      cachedModel6m = model;
      inflight6m = null;
      return model;
    })();
    return inflight6m;
  }

  async function loadModel12m() {
    if (cachedModel12m) return cachedModel12m;
    if (inflight12m) return inflight12m;
    inflight12m = (async () => {
      const csv = (await fetchTextMaybe("model_beta_12m.csv")) ?? EMBEDDED_BETA_12M_CSV;
      const model = parseBetaCsv(csv);
      cachedModel12m = model;
      inflight12m = null;
      return model;
    })();
    return inflight12m;
  }

  /**
   * Load predictor name mapping from 1_25_regression.csv
   * Maps new predictor names (e.g., "age", "age2", "myocardial_date_init1") to old names (e.g., "Age", "Age >46", "Prior MI")
   */
  async function loadPredictorNameMap() {
    if (predictorNameMap) return predictorNameMap;
    if (inflightNameMap) return inflightNameMap;
    
    inflightNameMap = (async () => {
      const csv = await fetchTextMaybe("1_25_regression.csv");
      if (!csv) {
        // Return empty map if CSV not available
        predictorNameMap = new Map();
        inflightNameMap = null;
        return predictorNameMap;
      }
      
      const lines = csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      
      if (lines.length < 2) {
        predictorNameMap = new Map();
        inflightNameMap = null;
        return predictorNameMap;
      }
      
      const map = new Map();
      
      // Parse old CSV format: Predictor,12 months estimate
      for (let i = 1; i < lines.length; i++) {
        const [oldName] = lines[i].split(',').map(s => s.trim());
        if (!oldName) continue;
        
        // Map old names to new names based on the mapping logic in buildPredictorsFromForm
        let newName = null;
        
        // Core variables
        if (oldName === "Intercept") newName = "(Intercept)";
        else if (oldName === "Age") newName = "age";
        else if (oldName === "Age >46") newName = "age2";
        else if (oldName === "Age >65") newName = "age3";
        else if (oldName === "Female") newName = "sexF";
        else if (oldName === "HCC") newName = "hcc_date_init1";
        
        // Labs
        else if (oldName === "Missing Sodium") newName = "sodium_lab_miss1";
        else if (oldName === "Sodium") newName = "sodium_lab";
        else if (oldName === "Sodium >133") newName = "sodium_lab2";
        else if (oldName === "Missing Creatinine") newName = "creat_lab_miss1";
        else if (oldName === "Creatinine") newName = "creat_lab";
        else if (oldName === "Creatinine >0.6") newName = "creat_lab2";
        else if (oldName === "Creatinine >1.3") newName = "creat_lab3";
        else if (oldName === "Missing Platelet") newName = "platelet_lab_miss1";
        else if (oldName === "Platelet (per 1k)") newName = "platelet_lab";
        else if (oldName === "Platelet >100k (per 1k)") newName = "platelet_lab2";
        else if (oldName === "Platelet >390k (per 1k)") newName = "platelet_lab3";
        else if (oldName === "Missing Albumin") newName = "albumin_lab_miss1";
        else if (oldName === "Albumin") newName = "albumin_lab";
        else if (oldName === "Albumin >3.5") newName = "albumin_lab2";
        else if (oldName === "Missing INR") newName = "inr_lab_miss1";
        else if (oldName === "INR") newName = "inr_lab";
        else if (oldName === "INR >1.2") newName = "inr_lab2";
        else if (oldName === "INR >2") newName = "inr_lab3";
        else if (oldName === "Missing Bilirubin") newName = "bilirubin_lab_miss1";
        else if (oldName === "Bilirubin") newName = "bilirubin_lab";
        else if (oldName === "Bilirubin >1.5") newName = "bilirubin_lab3";
        
        // Comorbidities
        else if (oldName === "Prior MI") newName = "myocardial_date_init1";
        else if (oldName === "CHF") newName = "heart_fail_date_init1";
        else if (oldName === "PAD") newName = "periph_date_init1";
        else if (oldName === "CVA") newName = "cerebro_date_init1";
        else if (oldName === "Dementia") newName = "dementia_date_init1";
        else if (oldName === "COPD") newName = "pulmonary_date_init1";
        else if (oldName === "Rheumatic Disease") newName = "rheumatic_date_init1";
        else if (oldName === "PUD") newName = "ulcer_date_init1";
        else if (oldName === "Uncomplicated DA") newName = "diab_unc_date_init1";
        else if (oldName === "Hemiplegia") newName = "paralysis_date_init1";
        else if (oldName === "Complicated DA") newName = "diab_com_date_init1";
        else if (oldName === "Malignancy") newName = "malignancy_date_init1";
        else if (oldName === "Metastasis") newName = "meta_cancer_date_init1";
        else if (oldName === "AIDS") newName = "aids_date_init1";
        else if (oldName === "Mild/Moderate Renal Disease") newName = "renal_mild_date_init1";
        else if (oldName === "Severe Renal Disease") newName = "renal_severe_date_init1";
        
        // Etiology
        else if (oldName === "ALD") newName = "etiology_m0nALD";
        else if (oldName === "METALD") newName = "etiology_m0nMETALD";
        else if (oldName === "HCV") newName = "etiology_m0nHCV";
        else if (oldName === "HBV") newName = "etiology_m0nHBV";
        else if (oldName === "Biliary") newName = "etiology_m0nBiliary";
        else if (oldName === "Other") newName = "etiology_m0nOther";
        else if (oldName === "2+ Etiologies") newName = "etiology_m0n2+ Etiologies";
        else if (oldName === "Unknown") newName = "etiology_m0nUnknown";
        
        if (newName) {
          map.set(newName, oldName);
        }
      }
      
      predictorNameMap = map;
      inflightNameMap = null;
      return map;
    })();
    
    return inflightNameMap;
  }

  /**
   * Get display name for a predictor (old name from 1_25_regression.csv if available, otherwise new name)
   */
  async function getPredictorDisplayName(newName) {
    const map = await loadPredictorNameMap();
    return map.get(newName) || newName;
  }

  function clampNonNegative(x) {
    return x > 0 ? x : 0;
  }

  function logistic(z) {
    return 1 / (1 + Math.exp(-z));
  }

  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  /**
   * @param {number[]} x
   * @param {number[][]} sigma
   */
  function quadForm(x, sigma) {
    // x' Σ x
    let acc = 0;
    for (let i = 0; i < x.length; i++) {
      let rowSum = 0;
      const si = sigma[i];
      for (let j = 0; j < x.length; j++) rowSum += (si?.[j] ?? 0) * x[j];
      acc += x[i] * rowSum;
    }
    return acc;
  }

  /**
   * Build predictor map using new predictor names (age, age2, age3, sexF, etc.)
   * @param {{
   *  age: number,
   *  female: boolean,
   *  etiology: string,
   *  hcc: boolean,
   *  labs: { sodium?: number|null, creatinine?: number|null, platelet_k?: number|null, albumin?: number|null, inr?: number|null, bilirubin?: number|null },
   *  comorbidities: Record<string, boolean>
   * }} formValues
   */
  function buildPredictorsFromForm(formValues) {
    const m = /** @type {Record<string, number>} */ ({});

    // --- Core
    m["(Intercept)"] = 1;
    const age = Number(formValues.age);
    m["age"] = age;
    m["age2"] = clampNonNegative(age - 46);  // threshold 46
    m["age3"] = clampNonNegative(age - 65);  // threshold 65
    m["sexF"] = formValues.female ? 1 : 0;
    m["hcc_date_init1"] = formValues.hcc ? 1 : 0;

    // --- Labs (missing indicators + hinge terms)
    const sodium = formValues.labs?.sodium ?? null;
    const creat = formValues.labs?.creatinine ?? null;
    const pltK = formValues.labs?.platelet_k ?? null; // platelets entered as K/µL (thousands/µL)
    const alb = formValues.labs?.albumin ?? null;
    const inr = formValues.labs?.inr ?? null;
    const bili = formValues.labs?.bilirubin ?? null;

    // Sodium
    m["sodium_lab_miss1"] = sodium == null ? 1 : 0;
    m["sodium_lab"] = sodium == null ? 0 : sodium;
    m["sodium_lab2"] = sodium == null ? 0 : clampNonNegative(sodium - 133);  // threshold 133

    // Creatinine
    m["creat_lab_miss1"] = creat == null ? 1 : 0;
    m["creat_lab"] = creat == null ? 0 : creat;
    m["creat_lab2"] = creat == null ? 0 : clampNonNegative(creat - 0.6);  // threshold 0.6
    m["creat_lab3"] = creat == null ? 0 : clampNonNegative(creat - 1.3);  // threshold 1.3

    // Platelets (per 1k) — user input in K/µL, so already per-1k units
    m["platelet_lab_miss1"] = pltK == null ? 1 : 0;
    m["platelet_lab"] = pltK == null ? 0 : pltK;
    m["platelet_lab2"] = pltK == null ? 0 : clampNonNegative(pltK - 100);  // threshold 100
    m["platelet_lab3"] = pltK == null ? 0 : clampNonNegative(pltK - 390);  // threshold 390

    // Albumin
    m["albumin_lab_miss1"] = alb == null ? 1 : 0;
    m["albumin_lab"] = alb == null ? 0 : alb;
    m["albumin_lab2"] = alb == null ? 0 : clampNonNegative(alb - 3.5);  // threshold 3.5

    // INR
    m["inr_lab_miss1"] = inr == null ? 1 : 0;
    m["inr_lab"] = inr == null ? 0 : inr;
    m["inr_lab2"] = inr == null ? 0 : clampNonNegative(inr - 1.2);  // threshold 1.2
    m["inr_lab3"] = inr == null ? 0 : clampNonNegative(inr - 2);  // threshold 2

    // Bilirubin
    m["bilirubin_lab_miss1"] = bili == null ? 1 : 0;
    m["bilirubin_lab"] = bili == null ? 0 : bili;
    m["bilirubin_lab3"] = bili == null ? 0 : clampNonNegative(bili - 1.5);  // threshold 1.5

    // --- Comorbidities (map old names to new names)
    const comorbidityMap = {
      "Prior MI": "myocardial_date_init1",
      "CHF": "heart_fail_date_init1",
      "PAD": "periph_date_init1",
      "CVA": "cerebro_date_init1",
      "Dementia": "dementia_date_init1",
      "COPD": "pulmonary_date_init1",
      "Rheumatic Disease": "rheumatic_date_init1",
      "PUD": "ulcer_date_init1",
      "Uncomplicated DA": "diab_unc_date_init1",
      "Hemiplegia": "paralysis_date_init1",
      "Complicated DA": "diab_com_date_init1",
      "Malignancy": "malignancy_date_init1",
      "Metastasis": "meta_cancer_date_init1",
      "AIDS": "aids_date_init1",
      "Mild/Moderate Renal Disease": "renal_mild_date_init1",
      "Severe Renal Disease": "renal_severe_date_init1"
    };
    
    // Initialize all comorbidity predictors to 0 first
    for (const newName of Object.values(comorbidityMap)) {
      m[newName] = 0;
    }
    
    // Then set to 1 if checked (formValues.comorbidities keys match old predictor names)
    for (const [oldName, v] of Object.entries(formValues.comorbidities || {})) {
      const newName = comorbidityMap[oldName];
      if (newName && v) {
        m[newName] = 1;
      }
    }

    // --- Etiology dummies (new names: etiology_m0nALD, etiology_m0nMETALD, etc.)
    // Baseline category is MASLD (not represented by any dummy).
    const et = (formValues.etiology || "").trim();
    const etiologyPredictors = [
      "etiology_m0nALD",
      "etiology_m0nMETALD",
      "etiology_m0nHCV",
      "etiology_m0nHBV",
      "etiology_m0nBiliary",
      "etiology_m0nOther",
      "etiology_m0n2+ Etiologies",
      "etiology_m0nUnknown"
    ];
    for (const p of etiologyPredictors) m[p] = 0;

    // Map UI values to new predictor names
    const etiologyMap = {
      "ALD": "etiology_m0nALD",
      "METALD": "etiology_m0nMETALD",
      "MetALD": "etiology_m0nMETALD",
      "HCV": "etiology_m0nHCV",
      "HBV": "etiology_m0nHBV",
      "Biliary": "etiology_m0nBiliary",
      "Other": "etiology_m0nOther",
      "Other Etiology at Diagnosis": "etiology_m0nOther",
      "2 plus": "etiology_m0n2+ Etiologies",
      "2+ Etiologies": "etiology_m0n2+ Etiologies",
      "Unknown": "etiology_m0nUnknown",
      "No Etiology Diagnosed": "etiology_m0nUnknown",
    };
    const mapped = etiologyMap[et];
    if (mapped && Object.prototype.hasOwnProperty.call(m, mapped)) m[mapped] = 1;

    return m;
  }

  function buildXFromModelOrder(model, predictorMap) {
    const x = new Array(model.predictors.length);
    for (let i = 0; i < model.predictors.length; i++) {
      const name = model.predictors[i];
      const val = predictorMap[name];
      x[i] = Number.isFinite(val) ? val : 0;
    }
    // Validation: ensure X vector length matches model
    if (x.length !== model.predictors.length) {
      throw new Error(`X vector length (${x.length}) does not match model predictors (${model.predictors.length})`);
    }
    if (x.length !== model.betas.length) {
      throw new Error(`X vector length (${x.length}) does not match beta vector (${model.betas.length})`);
    }
    return x;
  }

  /**
   * Validate and align a provided Σ object to the model's predictor order.
   * Accepts:
   *   - number[][] (assumed already aligned)
   *   - { predictors: string[], sigma: number[][] } (will be aligned by predictor name)
   *
   * Returns null if Σ is missing/invalid.
   *
   * @param {{ predictors: string[], betas: number[] }} model
   * @param {any} sigmaInput
   * @returns {number[][] | null}
   */
  function getAlignedSigma(model, sigmaInput) {
    if (!sigmaInput) return null;

    // Case 1: raw matrix already aligned
    if (Array.isArray(sigmaInput) && Array.isArray(sigmaInput[0])) {
      const sigma = /** @type {number[][]} */ (sigmaInput);
      if (sigma.length !== model.predictors.length) return null;
      return sigma;
    }

    // Case 2: object with predictors + sigma
    const preds = sigmaInput?.predictors;
    const sigma = sigmaInput?.sigma;
    if (!Array.isArray(preds) || !Array.isArray(sigma) || !Array.isArray(sigma[0])) return null;
    if (preds.length !== model.predictors.length) return null;

    const indexByName = new Map();
    for (let i = 0; i < preds.length; i++) indexByName.set(String(preds[i]), i);

    // Rebuild Σ in model order
    const n = model.predictors.length;
    const aligned = new Array(n);
    for (let i = 0; i < n; i++) {
      const nameI = model.predictors[i];
      const srcI = indexByName.get(nameI);
      if (srcI == null) return null;
      const row = new Array(n);
      for (let j = 0; j < n; j++) {
        const nameJ = model.predictors[j];
        const srcJ = indexByName.get(nameJ);
        if (srcJ == null) return null;
        row[j] = Number(sigma[srcI]?.[srcJ] ?? 0);
      }
      aligned[i] = row;
    }
    return aligned;
  }

  /**
   * Evaluate both 6m and 12m models
   * @param {*} formValues
   * @param {{ sigma6m?: number[][] | null, sigma12m?: number[][] | null }} opts
   */
  async function evaluate(formValues, opts) {
    const [model6m, model12m] = await Promise.all([
      loadModel6m(),
      loadModel12m()
    ]);
    
    const predictorMap = buildPredictorsFromForm(formValues);
    
    // Build X vectors for both models
    const x6m = buildXFromModelOrder(model6m, predictorMap);
    const x12m = buildXFromModelOrder(model12m, predictorMap);
    
    // Calculate 6m results
    const z6m = dot(x6m, model6m.betas);
    const p6m = logistic(z6m);
    
    /** @type {{lower: number, upper: number, se: number} | null} */
    let ci6m = null;
    const sigmaAligned6m = getAlignedSigma(model6m, opts?.sigma6m ?? null);
    if (sigmaAligned6m) {
      const q = quadForm(x6m, sigmaAligned6m);
      const se = Math.sqrt(Math.max(0, q));
      const zLo = z6m - 1.96 * se;
      const zHi = z6m + 1.96 * se;
      ci6m = { lower: logistic(zLo), upper: logistic(zHi), se };
    }
    
    // Load predictor name map for display names
    const nameMap = await loadPredictorNameMap();
    
    const contributions6m = model6m.predictors.map((name, i) => ({
      name,
      displayName: nameMap.get(name) || name,
      x: x6m[i],
      beta: model6m.betas[i],
      contrib: x6m[i] * model6m.betas[i],
    }));
    
    // Calculate 12m results
    const z12m = dot(x12m, model12m.betas);
    const p12m = logistic(z12m);
    
    /** @type {{lower: number, upper: number, se: number} | null} */
    let ci12m = null;
    const sigmaAligned12m = getAlignedSigma(model12m, opts?.sigma12m ?? null);
    if (sigmaAligned12m) {
      const q = quadForm(x12m, sigmaAligned12m);
      const se = Math.sqrt(Math.max(0, q));
      const zLo = z12m - 1.96 * se;
      const zHi = z12m + 1.96 * se;
      ci12m = { lower: logistic(zLo), upper: logistic(zHi), se };
    }
    
    const contributions12m = model12m.predictors.map((name, i) => ({
      name,
      displayName: nameMap.get(name) || name,
      x: x12m[i],
      beta: model12m.betas[i],
      contrib: x12m[i] * model12m.betas[i],
    }));

    return {
      model6m,
      model12m,
      predictorMap,
      x6m,
      x12m,
      z6m,
      z12m,
      p6m,
      p12m,
      ci6m,
      ci12m,
      contributions6m,
      contributions12m,
    };
  }

  window.Prototype2Model = {
    loadModel6m,
    loadModel12m,
    buildPredictorsFromForm,
    evaluate,
    getAlignedSigma,
    loadPredictorNameMap,
    getPredictorDisplayName,
  };
})();
