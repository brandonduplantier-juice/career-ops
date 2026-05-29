# Reads job_scanner.py and expands the company lists
with open('job_scanner.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_greenhouse = """GREENHOUSE_COMPANIES = [
    # Healthcare Payers / Insurance
    "natera", "truveta", "freenome", "flatironhealth", "komodohealth",
    "headway", "modernhealth", "doximity", "cloverhealth", "omadahealth",
    "smarterdx", "oscarhealth", "springhealth66", "rxsense", "veracyte",
    "includedhealth", "cityblock", "vizai", "pathai", "verily",
    "talkiatry", "sondermind", "commure", "akasa", "ambiencehealthcare",
    "abridge", "welbehealth", "mcghealth", "sifthealthcare", "transcarent",
    "ansiblehealth", "quantilehealth", "healthverity", "midihealth",
    "virta", "machinifyinc", "precisionmedicinegroup", "cotiviti",
    "evolent", "insitro", "recursion", "benchling", "guardanthealth",
    "tempus", "sagebionetworks", "primemedicine", "pacbio",
    "exscientia", "owkin", "paige", "scale", "labelbox", "snorkelai",
    "anthropic", "openai", "cohere", "databricks", "hex-inc", "retool",
    "statsig", "apollo", "datavant", "segment", "gitlab", "cloudflare",
    "stripe", "ramp", "brex", "deel", "harnham", "insightglobal",
    "publicconsultinggroup", "10xgenomics", "illumina", "grail",
    "foundationmedicine", "adaptivebiotech", "premierinc",
    "strivehealthmanagement", "nomi-health", "privia",
    "paradigmbiopharma", "roivant", "schrodinger", "deepgenomics",
    "arcus", "novavax", "assemblybio", "envedabio", "vaxcyte",
    "pitchbookdata", "windfall", "openx", "perplexityai",
    "acorns", "goody", "tailscale",
    # Additional Healthcare
    "accolade", "carrotfertility", "hingehealth", "swordhealth",
    "noom", "premisehealth", "crossoverhealth", "collectivehealth",
    "brightspring", "aveanna", "bayada", "kindredhealthcare",
    "molina", "centene", "magellanhealth", "beaconhealthoptions",
    "valueoptions", "multiplan", "zelis", "change-healthcare",
    "experian-health", "inovalon", "healthstream", "healthgrades",
    "castlighthealth", "healtheon", "livanova", "nuvation",
    "tempus-ex-machina", "flatiron", "caris", "foundation-medicine",
    "guardant", "exact-sciences", "neogenomics", "myriad-genetics",
    "navisite", "nuvolo", "nuance", "nuancecommunications",
    "optum", "unitedhealthgroup", "aetna", "cigna", "humana",
    "anthem", "bcbs", "wellmark", "premera", "regence",
    # Analytics / BI Companies
    "tableau", "alteryx", "microstrategy", "qlik", "domo",
    "looker", "thoughtspot", "sisense", "yellowfinbi",
    "gooddata", "metabase", "mode", "sigma-computing",
    "montecarlo", "datafold", "atlan", "alation", "collibra",
    "informatica", "talend", "fivetran", "stitch", "airbyte",
    "dbtlabs", "astronomer", "prefect", "dagster",
    # CROs / Life Sciences Data
    "iqvia", "parexel", "ppd", "medpace", "covance",
    "syneos", "pra", "icon", "ergoresearch", "clinipace",
    "medrio", "medidata", "veeva", "oracle-health",
    "cerner", "epic", "allscripts", "athenahealth",
    "nextgen", "greenway", "eclinicalworks",
    # Staffing / Consulting
    "mckinsey", "boozallen", "leidos", "saic", "mitre",
    "icf", "mathematica", "urban-institute", "rand",
    "norc", "westat", "abt-associates",
]"""

new_lever = """LEVER_COMPANIES = [
    # Healthcare
    "hsag", "headway", "modernhealth", "cityblock", "virta",
    "bighealth", "teselagen", "clover-health", "omada",
    "included-health", "strive-health", "qualified-health-pbc",
    "interra-health", "wellth", "solace", "alignment-healthcare",
    "privia-health", "evolent-health", "devoted-health",
    "insitro", "arc-institute", "formation-bio", "generate-biomedicines",
    "newlimit", "retro-biosciences", "gretel", "cradle",
    "scale-ai", "outlier-ai", "invisible-technologies", "turing",
    "snorkel-ai", "surge-hq", "hex", "retool", "statsig", "mercury",
    "attio", "pave", "linear", "beehiiv", "ramp", "dbt-labs",
    "leavitt-group", "windfall-data", "harnham",
    "catch-health", "bright-health", "devoted-health",
    "collective-health", "accolade", "carebridge", "carrot-fertility",
    "hinge-health", "sword-health", "noom", "ro-health",
    "premise-health", "crossover-health", "apree-health",
    # Additional Health Tech
    "talkspace", "betterhelp", "cerebral", "brightside",
    "ginger", "lyra-health", "spring-health", "vida-health",
    "livongo", "teladoc", "mdlive", "amwell", "doctor-on-demand",
    "98point6", "forward", "one-medical", "carbon-health",
    "color-health", "everlywell", "letsgetchecked", "nurx",
    "thirty-madison", "keeps", "hims", "ro",
    # Pharma Data / RWE
    "flatiron-health", "aetion", "cerner-enviza", "genesis-research",
    "open-health", "purple-squirrel", "inovalon", "healthverity",
    "datavant", "veeva", "medidata", "iqvia", "parexel",
    # Analytics Staffing
    "harnham", "burtch-works", "insight-global", "robert-half",
    "apex-systems", "tek-systems", "kelly-services",
]"""

new_ashby = """ASHBY_COMPANIES = [
    "leavitt", "qualified-health-pbc", "quantilehealth",
    "relationrx", "commure", "akasa", "solace", "wellth",
    "formation-bio", "arc-institute", "newlimit", "cradle",
    "hex", "retool", "cursor", "harvey", "perplexity",
    "goody", "acorns", "levels", "clay", "attio", "pave",
    "statsig", "mercury", "workos", "beehiiv", "apollographql",
    "catch-health", "strive", "interra-health",
    "hinge-health", "sword-health", "carrot-fertility",
    "noom", "ro", "premise-health", "crossover-health",
    "collectivehealth", "accolade",
    # Additional
    "talkspace", "cerebral", "brightside", "ginger",
    "lyra-health", "vida-health", "everlywell", "nurx",
    "thirty-madison", "carbon-health", "color-health",
    "forward-health", "one-medical", "98point6",
    "aetion", "genesis-research", "open-health",
    "purple-squirrel", "inovalon",
    "dbtlabs", "fivetran", "airbyte", "prefect",
    "dagster", "astronomer", "montecarlo", "datafold",
    "atlan", "alation", "collibra", "sigma-computing",
    "mode-analytics", "metabase", "thoughtspot",
]"""

# Replace the old lists
import re
content = re.sub(r'GREENHOUSE_COMPANIES = \[.*?\]', new_greenhouse, content, flags=re.DOTALL)
content = re.sub(r'LEVER_COMPANIES = \[.*?\]', new_lever, content, flags=re.DOTALL)
content = re.sub(r'ASHBY_COMPANIES = \[.*?\]', new_ashby, content, flags=re.DOTALL)

with open('job_scanner.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Count companies
gh = content.count('GREENHOUSE_COMPANIES') 
print('Done. Verifying company counts...')
import ast, re
gh_match = re.search(r'GREENHOUSE_COMPANIES = \[(.*?)\]', content, re.DOTALL)
lv_match = re.search(r'LEVER_COMPANIES = \[(.*?)\]', content, re.DOTALL)
ab_match = re.search(r'ASHBY_COMPANIES = \[(.*?)\]', content, re.DOTALL)

def count_entries(block):
    return block.count('"')//2

print(f"Greenhouse: ~{count_entries(gh_match.group(1))} companies")
print(f"Lever: ~{count_entries(lv_match.group(1))} companies")
print(f"Ashby: ~{count_entries(ab_match.group(1))} companies")