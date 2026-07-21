$ErrorActionPreference = 'Stop'
$source = (Resolve-Path "$PSScriptRoot\..\Mupenzi-Research-Proposal_final.docx").Path
$output = Join-Path (Split-Path $source) 'Mupenzi-Final-Year-Project-Book.docx'

$chapterText = @'
CHAPTER FOUR: SYSTEM ANALYSIS, DESIGN AND IMPLEMENTATION
4.1 Introduction
This chapter presents the analysis, design, implementation and testing of VerifyAI, the Automated Brand Asset and Packaging Compliance System developed for Rwandan SME exporters. It translates the problem, objectives and methodology discussed in the preceding chapters into an operational software solution. The chapter documents the findings that informed the requirements, the limitations of the existing process, system modules, data flows, use cases, database design, front-end architecture, implementation technologies and test evidence.

4.2 Data Analysis and Presentation
The requirements analysis combined the case-study workflow described in Chapter Three with examination of packaging regulations, brand assets and the practical activities performed by exporters, designers and compliance administrators. The evidence was organized around recurring tasks rather than invented respondent percentages. The principal operational findings were: regulatory requirements are stored in long documents; packaging inspection requires both textual and visual checks; designers need rapid feedback before submission; official brand assets must be registered once and reused; and SMEs require an understandable score, issues and correction recommendations rather than raw AI output.

The implemented system therefore treats the administrator, SME exporter and designer as distinct actors. Administrators maintain users, markets, product categories, regulation documents and approved reference packaging. Exporters maintain company data, brands and controlled designer accounts. Designers upload packaging against a selected brand, product category and destination market. VerifyAI extracts text and visual evidence, compares the evidence with active regulation requirements and official brand profiles, calculates compliance results and produces a downloadable report.

4.2.1 Functional Findings
Finding 1: Manual regulation reading is slow and inconsistent. The solution accepts PDF and DOCX regulation sets, extracts structured requirements and stores them as JSON and normalized rules for subsequent verification.
Finding 2: Brand identity cannot be verified reliably against the full package image. The implemented pipeline uses the official logo as a reference, detects candidate logo regions, normalizes scale and background, and combines visual features, text, colour and aspect-ratio evidence.
Finding 3: OCR output alone is not a compliance decision. Extracted text is normalized into assets such as product name, ingredients, nutrition facts, country of origin, net weight, dates, barcode, QR code and storage instructions before rules are evaluated.
Finding 4: Different users require different authority. Role-based access separates administration, SME ownership and designer execution, while company membership limits designers to brands belonging to their assigned SME.
Finding 5: Results must be actionable. The output includes regulation score, brand-asset score, overall compliance score, export status, detected assets, issues, recommendations, correction suggestions and a PDF report.

4.3 Interpretation of Findings and Results
The findings demonstrate that packaging compliance is a multi-source decision problem. A package may contain correct regulatory text but use an altered logo; conversely, it may preserve the brand identity while omitting a mandatory statement. VerifyAI consequently applies separate regulation and brand-asset subscores and combines them into an overall score. The completed honey-package test demonstrated this distinction: all extracted regulatory rules could pass while an uncertain logo comparison reduced the brand score and changed the export decision to needs correction. This behavior is more informative than a single binary result.

The system also demonstrated that preprocessing affects accuracy. Text recognition improves when uploaded artwork is sufficiently clear, while logo comparison improves when a candidate logo region is cropped before comparison. Regulation verification produces meaningful results only when an active regulation set exists for the chosen market-category combination. These results justify the integrated architecture and explain why the administration workflow is part of the compliance solution rather than a separate convenience feature.

4.4 Summary of Findings and System Needs
The proposed solution required: centralized regulatory knowledge; automatic document extraction; company-scoped brand profiles; role-based access; secure image upload; OCR and computer-vision analysis; market-category rule selection; explainable scoring; correction guidance; history and reports; responsive interfaces; and safe management operations. Non-functional needs included authentication, authorization, data integrity, acceptable response time, recoverable error messages, maintainability, auditability and usability on common desktop and mobile screen sizes.

4.5 Description of the Existing System and Operations
Before VerifyAI, an SME or designer commonly inspected packaging manually. The user obtained a regulation document, searched it for relevant clauses, visually compared the artwork with a logo file, checked required text and sent the design to another person for review. Findings were recorded informally through messages, printed notes or spreadsheets. The process depended strongly on reviewer experience and could be repeated whenever the destination market changed.

The existing approach has several weaknesses: long turnaround time; inconsistent interpretation; difficulty maintaining current references; no reusable machine-readable rule base; limited traceability; inability to quantify brand consistency; and corrections discovered late in the design process. Commercial inspection products may provide OCR or generic image recognition, but they are not configured around the workflow, companies and regulatory references of Rwandan SME exporters.

4.6 Description of the New System
VerifyAI is a web-based, role-controlled packaging verification platform.

Administrator module: manages users, destination markets, product categories, regulation sets, reference packaging, verification oversight and system-wide reports. Regulation documents are uploaded in PDF or DOCX format and processed into active requirements. Management lists provide modal forms, search, filters, responsive tables and empty states.

SME exporter module: maintains the company profile, creates official brand asset profiles, uploads official logos, reviews AI-extracted dominant colours and logo metadata, creates designer accounts, uploads packaging, reviews results and accesses reports.

Designer module: accesses brands belonging to the assigned SME, selects a brand, category and export market, uploads packaging, starts verification, reviews detected assets and correction suggestions, downloads reports and manages uploaded packages.

AI analysis module: performs OCR, asset normalization, logo detection and comparison, dominant-colour analysis, barcode and QR evidence handling, regulation matching, score calculation and suggestion generation.

Reporting module: stores verification outcomes, issues and suggestions; provides user-specific reports and an administrator-wide reporting dashboard; and generates downloadable PDF evidence.

System configuration: a client computer requires a modern browser and network access. The development server uses Windows with XAMPP/MySQL, Node.js, Python 3, FastAPI/Uvicorn and Tesseract OCR. A practical deployment should provide at least a dual-core processor, 4 GB RAM and sufficient storage for regulation documents, logos, package images and reports. Higher memory and CPU capacity improve concurrent AI processing.

Technology platform: React and Vite implement the client; Axios communicates with REST APIs; Node.js and Express implement business services; MySQL stores transactional data; FastAPI and Python implement image/document analysis; OpenCV supports visual processing; Tesseract provides OCR; bcrypt hashes passwords; JWT provides stateless authentication; Multer controls uploads; and PDF generation produces compliance reports.

Non-functional requirements: passwords must be hashed; API routes must enforce roles and ownership; uploaded file types and sizes must be validated; database deletion must preserve referential integrity; interfaces must be responsive; errors must be understandable; verification outcomes must be traceable; and components must be modular enough to extend markets, assets and algorithms.

4.7 Illustration of the New System
4.7.1 Context Diagram and Data Flow
Figure 2: VerifyAI Context Diagram
ADMINISTRATOR -> users, markets, categories, regulations, references -> VERIFYAI
SME EXPORTER -> company, official brands, designers, packaging -> VERIFYAI
DESIGNER -> selected brand, market, category, package image -> VERIFYAI
VERIFYAI -> detected assets, scores, issues, suggestions, PDF reports -> USERS
VERIFYAI <-> MySQL database; VERIFYAI <-> OCR and computer-vision service

DFD Level 1 contains six principal processes: (1) authenticate and authorize user; (2) maintain regulatory and reference data; (3) maintain companies, brands and designers; (4) receive and validate packaging uploads; (5) extract and compare evidence; and (6) store and present verification reports. Data stores include Users and Companies, Brand Profiles, Regulation Knowledge, Packaging Uploads, Verification Evidence and Reports.

DFD Level 2 for verification: validate user and ownership; persist upload; obtain active regulation set by market and category; obtain official brand profile; send image to AI service; normalize OCR and visual outputs; evaluate every mandatory and optional rule; evaluate logo, placement and colours; calculate subscores; create issues and correction suggestions; save result; generate or display the report.

4.7.2 Use Case and Sequence Diagrams
Figure 3: Principal Use Cases
Administrator: log in; manage users; manage markets/categories; upload and activate regulations; manage references; review global reports.
Exporter: log in; manage company; create and edit brands; register official logo; manage designers; upload and verify package; review reports.
Designer: log in; select company brand; upload package; run verification; inspect issues; download report; delete own upload.

Figure 4: Verification Sequence
Designer -> React UI: submit brand, category, market, product and image
React UI -> Express API: multipart upload
Express API -> MySQL: create packaging_upload
React UI -> Express API: start verification
Express API -> FastAPI: image plus official-brand evidence
FastAPI -> Express API: OCR and visual-analysis JSON
Express API -> MySQL: detected assets, result, issues and suggestions
Express API -> React UI: result identifier
React UI -> Express API: request result/report
Express API -> React UI: explainable compliance result

4.7.3 Database Normalization
The database follows third normal form. Repeating market and category values are separated into export_markets and product_categories. Companies and users are separated because one company owns brands and may have multiple designer members. Brand profiles reference companies rather than duplicating company details. Packaging uploads reference user, brand, category and market keys. Verification results reference uploads; detected assets reference uploads; issues and suggestions reference results. Regulation sets reference markets and categories, while extracted regulations are represented independently. This design reduces update anomalies and ensures that a market name, company profile or brand reference is maintained in one authoritative location.

4.7.4 Data Dictionary
users: id (primary key), name, email (unique), password hash, role, company_name, phone, status, must_change_password and created_at.
companies: id, owner_user_id, company_name, registration_number, email, phone, address, status and timestamps.
company_members: id, company_id, user_id, member_role, membership status, creator and timestamps.
brands: id, company_id, brand_name, slogan, trademark, official_logo_path, dominant_colours, primary_colour, secondary_colour, logo_metadata and status.
export_markets: id, name, code and description.
product_categories: id, name and description.
regulation_sets: id, market_id, category_id, title, version, authority, effective_date, document path/type, extracted_requirements, processing status/error, creator and timestamps.
regulations: id, market/category or regulation-set reference, section, rule name, requirement, mandatory flag and recommendation.
reference_packagings: id, category_id, market_id, title, description and file path.
packaging_uploads: id, user_id, brand_id, category_id, market_id, product name, file path/type, status and creation time.
detected_assets: id, upload_id, asset type, detected value, confidence and status.
brand_asset_checks: id, upload_id, asset type, score/result evidence and status.
verification_results: id, upload_id, rule totals, compliance score, export status, summary and timestamp.
compliance_issues: id, result_id, regulation reference, issue type/description, recommendation and severity.
correction_suggestions: id, result_id, asset type, problem, suggestion and recommended position.
reports: id, result_id, report path and generated_at.

4.7.5 Entity Relationship Diagram
Figure 5: Entity Relationships
USERS 1--1 COMPANIES (owner); COMPANIES 1--N COMPANY_MEMBERS; USERS 1--N COMPANY_MEMBERS
COMPANIES 1--N BRANDS; USERS 1--N PACKAGING_UPLOADS; BRANDS 1--N PACKAGING_UPLOADS
MARKETS 1--N REGULATION_SETS; CATEGORIES 1--N REGULATION_SETS
MARKETS 1--N PACKAGING_UPLOADS; CATEGORIES 1--N PACKAGING_UPLOADS
PACKAGING_UPLOADS 1--N DETECTED_ASSETS; PACKAGING_UPLOADS 1--N VERIFICATION_RESULTS
VERIFICATION_RESULTS 1--N COMPLIANCE_ISSUES; VERIFICATION_RESULTS 1--N CORRECTION_SUGGESTIONS; VERIFICATION_RESULTS 1--N REPORTS

4.7.6 Physical Data Model
The physical model is implemented in MySQL using integer auto-increment primary keys, indexed foreign keys, unique email and membership constraints, enumerated status values and timestamps. Foreign-key restrictions protect verification history, while controlled transactional deletion removes dependent evidence before a user-owned upload is deleted. JSON-compatible text columns store extracted requirements, colour arrays and AI metadata without duplicating the stable relational entities.

4.8 Architecture of the Front-End
The React application uses route-based pages inside protected layouts. Authentication context stores the signed-in user and token. ProtectedRoute and AdminRoute enforce access before rendering. Exporter/designer pages share a dashboard layout and role-sensitive sidebar, while administration uses a separate layout and navigation. Service modules encapsulate Axios calls for authentication, users, companies, brands, markets, categories, uploads, verification, references, regulations and reports. Reusable modal, toolbar, search, table, alert, status and responsive styles provide consistent interaction.

4.9 Implementation and Coding
4.9.1 Introduction
Implementation was incremental. Authentication and core reference entities were developed first, followed by company and brand management, packaging upload, AI integration, verification persistence, reporting and administrative oversight. Each feature was compiled or syntax-checked before integration.

4.9.2 Implementation Tools and Technology
Visual Studio Code supported development; Git maintained source history; npm managed JavaScript dependencies; a Python virtual environment managed AI dependencies; XAMPP hosted MySQL; phpMyAdmin supported database inspection; Postman/browser developer tools supported API diagnosis; and Uvicorn served FastAPI. The frontend runs through Vite, while Express exposes versioned REST-style endpoints under /api.

4.9.3 Screens and Representative Source Operations
The implemented screens include login and registration; admin dashboard; user, market and category management; regulation-set processing; reference packaging; system reports; SME company, brands and designers; designer dashboard; packaging verification; upload history; detailed results; and PDF reports. Representative operations include POST /api/uploads for secure multipart upload, POST /api/verifications/start for analysis, GET /api/reports for role-scoped reports and DELETE /api/uploads/:id for owner-authorized transactional cleanup.

4.10 Testing
4.10.1 Introduction
Testing combined syntax validation, production compilation, API behavior checks, database-integrity inspection and scenario-based functional testing. Testing focused on both successful workflows and previously observed failures.

4.10.2 Objectives of Testing
The objectives were to confirm that modules perform their intended functions; unauthorized access is rejected; AI and business services exchange valid data; database relationships remain consistent; errors are understandable; and interfaces behave across desktop and narrow screens.

4.10.3 Unit Testing Outputs
Authentication validation rejected missing credentials and short passwords. Upload validation rejected missing brand, category, market, product or image. Search filters returned matching in-memory records without server mutation. Score normalization converted AI results into consistent detected, warning and missing states. Backend JavaScript files passed node --check, and the React application passed the Vite production build.

4.10.4 Validation Testing Outputs
File filters accepted JPG, PNG and WEBP packaging images within the configured size and accepted PDF, DOC and DOCX regulation documents. Duplicate user email creation returned a conflict. Designer creation required an active company. Exporter creation required a company name. Admin self-disable was rejected. Forms displayed backend validation messages rather than raw JSON.

4.10.5 Integration Testing Outputs
React successfully sent authenticated requests to Express. Express stored uploads and called FastAPI. Regulation extraction populated structured requirements and activated usable sets. Verification joined upload, brand, market, category and regulations, persisted detected assets and created reports. A foreign-key deletion failure was diagnosed and corrected with transactional dependency cleanup.

4.10.6 Functional and System Testing Results
TC01 valid login: passed; correct workspace opened.
TC02 inactive user login: passed; access rejected.
TC03 create exporter and company: passed; related records created.
TC04 create designer and assign company: passed; membership created.
TC05 upload official logo: passed; colours and metadata extracted.
TC06 upload regulation document: passed after service configuration; requirements stored.
TC07 upload package with brand selection: passed; upload identifier returned.
TC08 run packaging verification: passed; result, assets, issues and suggestions stored.
TC09 display structured result: passed; frontend rendered readable assets rather than JSON.
TC10 generate/download report: passed; PDF available to authorized user.
TC11 delete own upload: passed after dependency fix; related evidence removed transactionally.
TC12 access another user's upload: passed; request forbidden.
TC13 responsive management tables/modal forms: passed in narrow browser viewport.
TC14 system report search/filter: passed; matching global records displayed.

4.10.7 Acceptance Testing Report
Developer acceptance testing confirms that the implemented system satisfies the three specific objectives: OCR-based extraction is integrated; computer vision evaluates brand and packaging assets; and the compliance engine produces rules, scores, issues, suggestions and reports. Formal organizational acceptance should additionally be signed by the case-study representative and supervisor after testing with approved production packaging and authoritative regulation documents. Fields for participant name, role, signature, date and comments are provided in the appendices.

CHAPTER FIVE: CONCLUSIONS AND RECOMMENDATIONS
5.0 Introduction
This chapter concludes the study, presents recommendations for responsible adoption and identifies areas for further research.

5.1 Conclusions
The study designed and implemented VerifyAI, an Automated Brand Asset and Packaging Compliance System for Rwandan SME exporters. The completed platform demonstrates that OCR, computer vision and a rule-based compliance engine can be integrated into a practical role-controlled workflow. Administrators convert regulatory references into reusable system knowledge; exporters register companies and official brands; designers verify packages against a selected brand, market and category; and the system returns explainable evidence rather than an unsupported pass/fail decision.

The first objective was achieved through OCR and normalization of packaging text. The second was achieved through visual checks for logos, placement, colour consistency and machine-readable assets. The third was achieved through market-category regulation selection, compliance scoring, issue generation, correction recommendations, export status and PDF reporting. The project also addressed operational needs discovered during implementation, including company membership, user administration, searchable management pages, responsive layouts, secure ownership checks and transactional deletion.

VerifyAI does not replace regulators or laboratory certification. Its appropriate role is pre-submission decision support: it helps an SME detect likely omissions and brand inconsistencies earlier, creates a traceable review record and reduces avoidable correction cycles. Final regulatory approval remains the responsibility of competent authorities.

5.2 Recommendations
SMEs should maintain high-resolution official logos and complete brand profiles before verification. Administrators should upload only authoritative, current regulation documents and review AI-extracted requirements before activation. Packaging images should be clear, front-facing and sufficiently large for reliable OCR. Organizations should retain human review for ambiguous scores and high-risk requirements. Production deployment should use HTTPS, protected secrets, scheduled backups, malware scanning, centralized logs and separate worker queues for long AI tasks. Thresholds should be calibrated using a labelled local dataset rather than one product example.

The University and future developers should maintain test cases for every supported market-category pair and document algorithm/version changes. Regulators and export-support institutions may consider publishing machine-readable packaging requirements and anonymized validation datasets. SMEs should treat the correction suggestions as design guidance and confirm final labels with the relevant authority.

5.3 Areas for Further Research
Further work may investigate multilingual OCR for English, Kinyarwanda, French and Swahili; perspective correction for photographed containers; deep-learning logo detection trained on local brands; colour comparison under variable lighting; semantic interpretation of complex regulatory clauses; automatic regulation-version change detection; explainable confidence calibration; GS1 barcode validation; certification-mark authenticity; accessibility of package labels; mobile capture guidance; cloud scaling; and longitudinal measurement of whether pre-submission verification reduces rejection time and cost.

Research should also compare the weighted hybrid logo method with learned feature embeddings, evaluate precision and recall on a larger labelled packaging dataset, measure OCR character and field accuracy separately, study fairness across package materials and colours, and conduct formal user-acceptance studies with SMEs, designers and regulatory specialists.
'@

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($source)
  $doc.SaveAs2($output, 16)

  foreach ($pair in @(
    @('A research proposal submitted','A final year project book submitted'),
    @('This Research Proposal','This Final Year Project Book'),
    @('this research proposal','this final year project book'),
    @('research proposal','final year project book')
  )) {
    $find = $doc.Content.Find; $find.ClearFormatting(); $find.Replacement.ClearFormatting()
    $null = $find.Execute($pair[0],$false,$false,$false,$false,$false,$true,1,$false,$pair[1],2)
  }

  $abstract = $doc.Content.Duplicate
  if ($abstract.Find.Execute('Small and Medium Enterprises (SMEs) in Rwanda continue to expand*Keywords:', $false,$false,$true,$false,$false,$true,1)) {
    $abstract.Text = "This final year project designed and implemented VerifyAI, an Automated Brand Asset and Packaging Compliance System for Rwandan SME exporters. The system combines Optical Character Recognition, computer vision and a rule-based compliance engine to inspect packaging text, official logos, brand colours, barcodes, QR codes and market-specific requirements. A React client, Node.js/Express API, MySQL database and Python FastAPI analysis service support administrators, SME exporters and designers through role-controlled workflows. The implemented solution stores regulation requirements, official brand profiles, detected evidence, compliance issues, correction suggestions, export-readiness scores and PDF reports. Functional and integration testing confirmed secure account management, regulation processing, brand-scoped package verification, explainable results and report generation. VerifyAI is intended as pre-submission decision support and does not replace formal certification by competent authorities.`rKeywords:"
  }

  $insert = $doc.Content.Duplicate
  if (-not $insert.Find.Execute('Refersences', $false,$false,$false,$false,$false,$true,1)) {
    $insert = $doc.Content.Duplicate; $null = $insert.Find.Execute('REFERENCES', $false,$false,$false,$false,$false,$true,1)
  }
  $insert.Collapse(1)
  foreach ($line in ($chapterText -split "`n")) {
    $text = $line.TrimEnd()
    $insert.InsertBefore($text + "`r")
    $p = $insert.Paragraphs.Item(1)
    if ($text -match '^CHAPTER ') { $p.Style = 'Heading 1'; $p.Range.InsertBreak(7) }
    elseif ($text -match '^\d+\.\d+\.\d+ ') { $p.Style = 'Heading 3' }
    elseif ($text -match '^\d+\.\d+ ') { $p.Style = 'Heading 2' }
    elseif ($text -match '^Figure \d+:') { $p.Range.Font.Bold = $true; $p.Range.ParagraphFormat.Alignment = 1 }
    else { $p.Range.ParagraphFormat.Alignment = 3 }
    $insert.Collapse(0)
  }

  foreach ($section in $doc.Sections) {
    $footer = $section.Footers.Item(1)
    $footer.PageNumbers.Add(2, $true) | Out-Null
  }
  $doc.Fields.Update() | Out-Null
  $doc.Save()
  $doc.Close()
} finally {
  $word.Quit()
  [Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
Write-Output $output
