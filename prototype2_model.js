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
"(Intercept)",-2.27045349285217,3.103608353315,-0.731552836048746,0.464441544240445
"age",0.0228579568947421,0.00403161438094877,5.6696783806399,0.0000000143065827415596
"age2",-0.016719770721871,0.00520012029970875,-3.21526613967132,0.00130323634801834
"age3",-0.00735134851736118,0.00329191900375464,-2.23314987670611,0.0255390624199999
"sexF",0.0460482511607085,0.019097965365569,2.41116005183082,0.0159018684133406
"hcc_date_init1",0.749006612227872,0.0491374764205665,15.2430826080107,0.000000000000000000000000000000000000000000000000000183027369411234
"sodium_lab_miss1",-4.8317805289911,3.06808231340963,-1.5748536171513,0.115290236984014
"sodium_lab",-0.0321135606451555,0.0231716030351199,-1.38590155357326,0.165776966375845
"sodium_lab2",0.00296144903523821,0.0255537045486545,0.115891182415433,0.907738784020637
"creat_lab_miss1",-0.280858766563239,0.177047517505377,-1.58634682101492,0.112660656662811
"creat_lab",-1.01984905973058,0.312557830379826,-3.2629131655032,0.00110273302266276
"creat_lab2",1.26860586590111,0.341266796256277,3.71734338007042,0.000201328719674441
"creat_lab3",-0.0416609146091328,0.0988623679148553,-0.421403163689272,0.673460709379575
"platelet_lab_miss1",-0.757962931427244,0.101970572302362,-7.43315364730659,0.000000000000106038606921868
"platelet_lab",-0.0062530476935263,0.00106198664418597,-5.88806622734822,0.00000000390740547214283
"platelet_lab2",0.00365747724888458,0.00118101266325458,3.09689926508111,0.00195556315426402
"platelet_lab3",0.00349754501407478,0.000802230975717812,4.35977308274002,0.0000130197383878643
"albumin_lab_miss1",-0.234006294760267,0.0818960978292911,-2.85735585653963,0.00427186611467269
"albumin_lab",-0.144200094599232,0.0201574187587648,-7.15369841371836,0.000000000000844705412319059
"albumin_lab2",-0.147965954183362,0.118899480441287,-1.24446257993892,0.213329363257871
"inr_lab_miss1",3.3724361832535,0.427968043003004,7.88011216816446,0.00000000000000327087320821814
"inr_lab",3.09505331033159,0.389436334746666,7.94752064504963,0.00000000000000190281304199121
"inr_lab2",-3.10633680903111,0.479857785980315,-6.4734529683312,0.0000000000957882389790996
"inr_lab3",-0.0738614788200754,0.1962170283099,-0.376427466343139,0.70659912984507
"bilirubin_lab_miss1",0.720451825139691,0.0772402845880729,9.32741028832175,0.0000000000000000000108489210127072
"bilirubin_lab",0.752739881908122,0.0438449847049205,17.1682094765025,0.00000000000000000000000000000000000000000000000000000000000000000459373148710331
"bilirubin_lab3",-0.733749896383424,0.0472638276642123,-15.5245550909752,0.00000000000000000000000000000000000000000000000000000236639647159517
"myocardial_date_init1",0.0053197380183948,0.0351879229130413,0.151180790964595,0.879833102713231
"heart_fail_date_init1",0.282217739419698,0.0254604513103945,11.0845536859938,0.000000000000000000000000000149092080177949
"periph_date_init1",-0.0520832075552216,0.0250583767974477,-2.07847491384703,0.0376656391039224
"cerebro_date_init1",-0.00658068245615967,0.02874663347682,-0.228920108556922,0.818931011161226
"dementia_date_init1",0.194553562712032,0.045076298565323,4.31609446436893,0.0000158814037427085
"pulmonary_date_init1",-0.0140019386396667,0.0210028393046456,-0.666668845891213,0.504983796796987
"rheumatic_date_init1",0.00201517758629668,0.0384579621856755,0.0523994895144828,0.958210380868436
"ulcer_date_init1",0.0642046805362854,0.0483536178464868,1.32781544371969,0.184239083726034
"diab_unc_date_init1",0.0169640981725822,0.0222562475034261,0.762217358068597,0.445930287840864
"paralysis_date_init1",0.166096872608718,0.0655700239526355,2.53312203650707,0.0113051586389225
"diab_com_date_init1",0.0827016374146762,0.0267153402804077,3.09566101523054,0.00196374721208353
"malignancy_date_init1",0.0612429586060954,0.029283315550711,2.09139427876733,0.0364927346280488
"meta_cancer_date_init1",0.292136582265053,0.0516598107821439,5.65500681946031,0.0000000155840085009984
"aids_date_init1",0.691605268091153,0.276009048490631,2.50573403978322,0.012219749728339
"renal_mild_date_init1",0.0448009818765034,0.02817360230841,1.59017584567558,0.111795173485094
"renal_severe_date_init1",0.319479477868452,0.0437156426776716,7.30812721258772,0.000000000000270891275941942
"etiology_m0nALD",0.428992795774096,0.0507639512709436,8.45073689170536,0.0000000000000000289469932519265
"etiology_m0nMETALD",0.464064324699501,0.027280931624724,17.0105746784297,0.000000000000000000000000000000000000000000000000000000000000000068561942291333
"etiology_m0nHCV",-0.00383027513896044,0.0295994987380544,-0.129403378511815,0.897038474493807
"etiology_m0nHBV",-0.340134612084757,0.0839850288373301,-4.04994338626187,0.0000512300253092734
"etiology_m0nBiliary",-0.437828409487871,0.0482923007571728,-9.06621557936108,0.000000000000000000123222512079216
"etiology_m0nOther",-0.0963845838574093,0.0601465626432344,-1.60249529851148,0.109046126355698
"etiology_m0n2+ Etiologies",0.0249289988690907,0.0346740733421934,0.718952129536961,0.472170415369393
"etiology_m0nUnknown",-0.00183252966926236,0.0614002383684017,-0.0298456442180199,0.976190156142948`;

  /** Embedded fallback snapshot of model_beta_12m.csv */
  const EMBEDDED_BETA_12M_CSV = `"","Estimate","Std. Error","z value","Pr(>|z|)"
"(Intercept)",-1.23664646451143,2.68582584210606,-0.460434345788306,0.645204486680848
"age",0.0172778282915161,0.00290408124782155,5.94949893515439,0.00000000268964592000411
"age2",-0.00857289911248673,0.00380902105517593,-2.25068304645819,0.024405619301333
"age3",-0.0106442248321976,0.00255159862580414,-4.17159059601041,0.0000302480747969168
"sexF",0.0439631033705383,0.0146394713870063,3.00305265185729,0.00267286184405064
"hcc_date_init1",0.646335562339382,0.0430709236990837,15.0063083590922,0.00000000000000000000000000000000000000000000000000667614002632064
"sodium_lab_miss1",-4.8280558060751,2.66105862438101,-1.81433650571985,0.0696259345482778
"sodium_lab",-0.0332673638918959,0.0200853761862428,-1.65629777522823,0.0976615308247854
"sodium_lab2",0.0159652113359598,0.021859406517244,0.730358865112164,0.465170855307211
"creat_lab_miss1",-0.420755286342386,0.143856668273732,-2.92482296018262,0.00344652239886183
"creat_lab",-0.934470310640118,0.254193325363104,-3.67621891450245,0.000236716410134862
"creat_lab2",1.0534879456338,0.27587494876643,3.8187155098513,0.000134148360317442
"creat_lab3",0.0922630284451492,0.0784520855111361,1.17604303115757,0.239577681038103
"platelet_lab_miss1",-0.803768298388917,0.0847854303886395,-9.48002852264361,0.00000000000000000000254213576409854
"platelet_lab",-0.00597216683901927,0.000883536293138082,-6.75939051446065,0.0000000000138573429059122
"platelet_lab2",0.00303599974765923,0.000971342636308445,3.12557035403845,0.00177460615477716
"platelet_lab3",0.004830436092969,0.000604211035630558,7.99461745670909,0.00000000000000129976795576441
"albumin_lab_miss1",-0.197535295121833,0.0633950656575627,-3.11594117101869,0.00183358847896775
"albumin_lab",-0.175383412581888,0.0159713136385107,-10.9811513662218,0.000000000000000000000000000470883589312172
"albumin_lab2",0.0538727218024558,0.0859096912111842,0.627085501564954,0.530603190321743
"inr_lab_miss1",3.70858953107155,0.331458311174585,11.1887058071631,0.0000000000000000000000000000463144166597366
"inr_lab",3.43643292357021,0.303187755249128,11.3343394120469,0.00000000000000000000000000000886988082196143
"inr_lab2",-3.52653695887107,0.375853120906767,-9.38275289656527,0.00000000000000000000642722757585386
"inr_lab3",0.0422878231522538,0.1543594817216,0.273956757826665,0.784117852978305
"bilirubin_lab_miss1",0.622547298936282,0.05847993692345,10.645485130255,0.0000000000000000000000000183028368565037
"bilirubin_lab",0.664270882863392,0.0343015566698983,19.3656191541397,0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000150534264212621
"bilirubin_lab3",-0.655376849918966,0.0375272280831758,-17.4640356720827,0.0000000000000000000000000000000000000000000000000000000000000000000269211737837822
"myocardial_date_init1",0.00903786873654781,0.0273072326042403,0.330969778868929,0.740667313247981
"heart_fail_date_init1",0.253393015487948,0.019679098013647,12.8762515086934,0.0000000000000000000000000000000000000612383164425639
"periph_date_init1",-0.0760305742853084,0.0191668407606088,-3.96677654053267,0.0000728512367294032
"cerebro_date_init1",0.0103693308792361,0.0219642667550131,0.472100024776349,0.636855394794517
"dementia_date_init1",0.135988615791587,0.0362835736146141,3.74793886721276,0.000178293694113945
"pulmonary_date_init1",-0.0394098654817693,0.0159730907962493,-2.46726610300264,0.0136149136760906
"rheumatic_date_init1",-0.0224089743389858,0.029226228303903,-0.766741917772302,0.443234975743168
"ulcer_date_init1",0.112031301926504,0.0363891336616197,3.07870209190128,0.00207904466356527
"diab_unc_date_init1",0.0168904189114113,0.0170230350902871,0.99220960432893,0.321095288351104
"paralysis_date_init1",0.0477264214810319,0.0535148700480985,0.891834763648607,0.372481505408134
"diab_com_date_init1",0.144435931358533,0.0204854475239026,7.05066028896876,0.00000000000178070753179825
"malignancy_date_init1",-0.0030886954544508,0.0227661368718341,-0.135670600235743,0.89208169039661
"meta_cancer_date_init1",0.179077915454348,0.0446562997042123,4.01013780005278,0.0000606833220170965
"aids_date_init1",0.791447268521309,0.21016176035087,3.76589569482084,0.000165953067500359
"renal_mild_date_init1",0.00182112755356646,0.02170461573257,0.0839050815736707,0.933131899298877
"renal_severe_date_init1",0.306758665597652,0.0351203845747698,8.7344905049253,0.0000000000000000024475681678067
"etiology_m0nALD",0.415500589028824,0.0402894727423827,10.3128822679215,0.000000000000000000000000616248921564432
"etiology_m0nMETALD",0.461172738256501,0.0213005569079323,21.6507361873135,0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000059817195734406
"etiology_m0nHCV",-0.0823863479970883,0.0226386738045018,-3.63918614263991,0.000273501054551431
"etiology_m0nHBV",-0.36338191744801,0.0629830174706183,-5.76952219886145,0.00000000794966061749837
"etiology_m0nBiliary",-0.467539229363206,0.0354561873610156,-13.1863932408387,0.00000000000000000000000000000000000000105094295338439
"etiology_m0nOther",-0.0402411332389624,0.0439972624114996,-0.914628116235807,0.360386893174157
"etiology_m0n2+ Etiologies",-0.0732521859591555,0.0267508880329013,-2.73830857013276,0.0061756101700191
"etiology_m0nUnknown",-0.0631862179926503,0.0468691991074013,-1.34813948597369,0.177613523495941`;

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
