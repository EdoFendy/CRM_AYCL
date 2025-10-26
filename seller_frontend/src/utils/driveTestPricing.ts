// Drive Test Pricing Configuration
// Copied and adapted from aycl-homepage2/components/drive-test-calculator.tsx

export type Band = { id: string; label: string; min: number; max: number }
export type Coeff = { id: string; label: string; min: number; max: number }
export type SectorOption = {
  id: string
  label: string
  level: "macro" | "granular"
  min: number
  max: number
}

export type SectorGroup = {
  id: string
  label: string
  options: SectorOption[]
}

export const BASE_ITALIA: Band[] = [
  { id: "band_100k",       label: "< €100K",             min: 80,  max: 80  },
  { id: "band_100k_500k",  label: "€100K – €500K",       min: 90,  max: 95  },
  { id: "band_500k_1m",    label: "€500K – €1M",         min: 100, max: 120 },
  { id: "band_1m_5m",      label: "€1M – €5M",           min: 120, max: 140 },
  { id: "band_5m_10m",     label: "€5M – €10M",          min: 140, max: 160 },
  { id: "band_10m_20m",    label: "€10M – €20M",         min: 160, max: 180 },
  { id: "band_20m_50m",    label: "€20M – €50M",         min: 180, max: 220 },
  { id: "band_50m_plus",   label: "€50M+",               min: 220, max: 300 }
]

export const COEFF_GEO: Coeff[] = [
  { id: "geo_default",   label: "Predefinito",                        min: 1.0,  max: 1.0 },
  { id: "geo_italia",    label: "Italia",                            min: 1.0,  max: 1.0 },
  { id: "geo_sp_po",     label: "Spagna / Portogallo",               min: 1.1,  max: 1.1 },
  { id: "geo_fr_de_be",  label: "Francia / Germania / Benelux",      min: 1.2,  max: 1.3 },
  { id: "geo_uk_ie",     label: "UK / Irlanda",                      min: 1.25, max: 1.35 },
  { id: "geo_est",       label: "Est Europa",                         min: 1.2,  max: 1.4 },
  { id: "geo_nordics",   label: "Nordics (SE/NO/DK/FI)",             min: 1.2,  max: 1.3 },
  { id: "geo_us_ca",     label: "USA / Canada",                      min: 1.5,  max: 1.6 },
  { id: "geo_latam",     label: "LATAM",                              min: 1.1,  max: 1.2 },
  { id: "geo_me",        label: "Middle East",                        min: 1.3,  max: 1.6 },
  { id: "geo_africa",    label: "Africa",                             min: 1.2,  max: 1.3 },
  { id: "geo_asia",      label: "Asia (SG/HK/JP)",                    min: 1.4,  max: 1.6 },
  { id: "geo_oceania",   label: "Oceania (AU/NZ)",                    min: 1.4,  max: 1.5 }
]

const COEFF_SAAS = { min: 1.0826, max: 1.115078 }
const COEFF_SERVICES = { min: 1.093426, max: 1.223338 }
const COEFF_MANUFACTURING = { min: 1.277468, max: 1.429032 }
const COEFF_AUTOMOTIVE = { min: 1.288294, max: 1.439858 }
const COEFF_BANKING = { min: 1.602248, max: 2.208504 }
const COEFF_INSURANCE = { min: 1.6239, max: 2.230156 }
const COEFF_FINTECH = { min: 1.51564, max: 1.667204 }
const COEFF_ASSET_MANAGEMENT = { min: 1.6239, max: 2.230156 }
const COEFF_HEALTHCARE = { min: 1.504814, max: 1.67803 }
const COEFF_REAL_ESTATE = { min: 1.331598, max: 1.483162 }
const COEFF_RETAIL = { min: 1.212512, max: 1.364076 }
const COEFF_ECOMMERCE = { min: 1.13673, max: 1.266642 }
const COEFF_ENERGY = { min: 2.230156, max: 2.403372 }

export const SECTOR_GROUPS: SectorGroup[] = [
  {
    id: "macro_saas",
    label: "SaaS / Tech B2B",
    options: [
      { id: "saas_macro", label: "SaaS / Tech B2B", level: "macro", ...COEFF_SAAS },
      { id: "saas_horizontal", label: "SaaS orizzontale (CRM/ERP)", level: "granular", ...COEFF_SAAS },
      { id: "saas_vertical", label: "SaaS verticale (PropTech/LegalTech/HRTech)", level: "granular", ...COEFF_SAAS },
      { id: "saas_cyber", label: "Cybersecurity", level: "granular", ...COEFF_SAAS },
      { id: "saas_data_ai", label: "Data & Analytics / AI", level: "granular", ...COEFF_SAAS },
      { id: "saas_cloud", label: "Cloud & DevOps", level: "granular", ...COEFF_SAAS },
      { id: "saas_it_services", label: "IT Services & System Integration", level: "granular", ...COEFF_SAAS },
      { id: "saas_elearning", label: "E-learning B2B", level: "granular", ...COEFF_SAAS }
    ]
  },
  {
    id: "macro_services",
    label: "Servizi Professionali (Marketing/HR/Consulenza)",
    options: [
      { id: "services_macro", label: "Servizi Professionali (Marketing/HR/Consulenza)", level: "macro", ...COEFF_SERVICES },
      { id: "services_agencies", label: "Agenzie Marketing & Adv", level: "granular", ...COEFF_SERVICES },
      { id: "services_recruiting", label: "Recruiting & HR Services", level: "granular", ...COEFF_SERVICES },
      { id: "services_consulting", label: "Consulenza gestionale / strategica", level: "granular", ...COEFF_SERVICES },
      { id: "services_legal", label: "Servizi legali B2B", level: "granular", ...COEFF_SERVICES },
      { id: "services_accounting", label: "Contabilità & Tax", level: "granular", ...COEFF_SERVICES }
    ]
  },
  {
    id: "macro_industry",
    label: "Manifatturiero / Industria",
    options: [
      { id: "industry_macro", label: "Manifatturiero / Industria", level: "macro", ...COEFF_MANUFACTURING },
      { id: "industry_machinery", label: "Macchinari industriali", level: "granular", ...COEFF_MANUFACTURING },
      { id: "industry_electronics", label: "Elettronica/EMS", level: "granular", ...COEFF_MANUFACTURING },
      { id: "industry_chemistry", label: "Chimica & Materiali", level: "granular", ...COEFF_MANUFACTURING },
      { id: "industry_food", label: "Food & Beverage Industry", level: "granular", ...COEFF_MANUFACTURING },
      { id: "industry_aerospace", label: "Aerospace & Defense (civile)", level: "granular", ...COEFF_MANUFACTURING }
    ]
  },
  {
    id: "macro_automotive",
    label: "Automotive",
    options: [
      { id: "automotive_macro", label: "Automotive", level: "macro", ...COEFF_AUTOMOTIVE },
      { id: "automotive_oem", label: "Automotive OEM", level: "granular", ...COEFF_AUTOMOTIVE },
      { id: "automotive_tier", label: "Automotive Tier1/Tier2", level: "granular", ...COEFF_AUTOMOTIVE },
      { id: "automotive_mobility", label: "Mobilità & Componentistica", level: "granular", ...COEFF_AUTOMOTIVE }
    ]
  },
  {
    id: "macro_banking",
    label: "Banking",
    options: [
      { id: "banking_macro", label: "Banking", level: "macro", ...COEFF_BANKING },
      { id: "banking_retail", label: "Banche Retail", level: "granular", ...COEFF_BANKING },
      { id: "banking_corporate", label: "Banche Corporate/IB", level: "granular", ...COEFF_BANKING },
      { id: "banking_bpo", label: "Servizi BPO bancari", level: "granular", ...COEFF_BANKING }
    ]
  },
  {
    id: "macro_insurance",
    label: "Insurance",
    options: [
      { id: "insurance_macro", label: "Insurance", level: "macro", ...COEFF_INSURANCE },
      { id: "insurance_traditional", label: "Assicurazioni Danni/Vita", level: "granular", ...COEFF_INSURANCE },
      { id: "insurance_insurtech", label: "Insurtech", level: "granular", ...COEFF_INSURANCE }
    ]
  },
  {
    id: "macro_fintech",
    label: "Fintech",
    options: [
      { id: "fintech_macro", label: "Fintech", level: "macro", ...COEFF_FINTECH },
      { id: "fintech_payments", label: "Pagamenti", level: "granular", ...COEFF_FINTECH },
      { id: "fintech_lending", label: "Lending/P2P", level: "granular", ...COEFF_FINTECH },
      { id: "fintech_open_banking", label: "Open Banking/RegTech", level: "granular", ...COEFF_FINTECH }
    ]
  },
  {
    id: "macro_asset_management",
    label: "Asset Management / SGR",
    options: [
      { id: "asset_macro", label: "Asset Management / SGR", level: "macro", ...COEFF_ASSET_MANAGEMENT },
      { id: "asset_management", label: "Asset Management", level: "granular", ...COEFF_ASSET_MANAGEMENT },
      { id: "asset_private_banking", label: "Private Banking/Wealth", level: "granular", ...COEFF_ASSET_MANAGEMENT }
    ]
  },
  {
    id: "macro_healthcare",
    label: "Healthcare / Pharma / MedTech",
    options: [
      { id: "healthcare_macro", label: "Healthcare / Pharma / MedTech", level: "macro", ...COEFF_HEALTHCARE },
      { id: "healthcare_pharma", label: "Pharma", level: "granular", ...COEFF_HEALTHCARE },
      { id: "healthcare_biotech", label: "Biotech", level: "granular", ...COEFF_HEALTHCARE },
      { id: "healthcare_medtech", label: "MedTech / Dispositivi", level: "granular", ...COEFF_HEALTHCARE },
      { id: "healthcare_hospitals", label: "Ospedali & Cliniche", level: "granular", ...COEFF_HEALTHCARE },
      { id: "healthcare_diagnostics", label: "Diagnostica & Lab", level: "granular", ...COEFF_HEALTHCARE }
    ]
  },
  {
    id: "macro_real_estate",
    label: "Real Estate / Costruzioni / Facility",
    options: [
      { id: "real_estate_macro", label: "Real Estate / Costruzioni / Facility", level: "macro", ...COEFF_REAL_ESTATE },
      { id: "real_estate_development", label: "Sviluppo immobiliare", level: "granular", ...COEFF_REAL_ESTATE },
      { id: "real_estate_contractor", label: "General Contractor", level: "granular", ...COEFF_REAL_ESTATE },
      { id: "real_estate_facility", label: "Facility Management", level: "granular", ...COEFF_REAL_ESTATE },
      { id: "real_estate_proptech", label: "PropTech", level: "granular", ...COEFF_REAL_ESTATE }
    ]
  },
  {
    id: "macro_retail",
    label: "Retail (negozi fisici)",
    options: [
      { id: "retail_macro", label: "Retail (negozi fisici)", level: "macro", ...COEFF_RETAIL },
      { id: "retail_gdo", label: "GDO", level: "granular", ...COEFF_RETAIL },
      { id: "retail_specialized", label: "Catene retail specializzate", level: "granular", ...COEFF_RETAIL },
      { id: "retail_franchising", label: "Retail franchising", level: "granular", ...COEFF_RETAIL }
    ]
  },
  {
    id: "macro_ecommerce",
    label: "E-commerce (pure player/marketplace)",
    options: [
      { id: "ecommerce_macro", label: "E-commerce (pure player/marketplace)", level: "macro", ...COEFF_ECOMMERCE },
      { id: "ecommerce_pure", label: "E-commerce pure player", level: "granular", ...COEFF_ECOMMERCE },
      { id: "ecommerce_marketplace", label: "Marketplace", level: "granular", ...COEFF_ECOMMERCE },
      { id: "ecommerce_dnvb", label: "DNVB / D2C digitale", level: "granular", ...COEFF_ECOMMERCE }
    ]
  },
  {
    id: "macro_energy",
    label: "Energy & Utilities",
    options: [
      { id: "energy_macro", label: "Energy & Utilities", level: "macro", ...COEFF_ENERGY },
      { id: "energy_utility", label: "Utility (energia/acqua/gas)", level: "granular", ...COEFF_ENERGY },
      { id: "energy_renewables", label: "Rinnovabili (PV/Wind/Storage)", level: "granular", ...COEFF_ENERGY }
    ]
  }
]

// Regola: ≥ €10M non permette Drive Test
export const HIGH_REVENUE_IDS = new Set(["band_10m_20m", "band_20m_50m", "band_50m_plus"])
export const MIN_QTY = 5
export const MAX_QTY = 20
export const DEFAULT_QTY = 10

export function round5(value: number): number {
  return Math.round(value / 5) * 5
}

export function calculatePriceRange(band: Band, geo: Coeff, sector: SectorOption) {
  const min = round5(band.min * geo.min * sector.min)
  const max = round5(band.max * geo.max * sector.max)
  return { min, max }
}

export function calculateUnitPrice(band: Band, geo: Coeff, sector: SectorOption) {
  const baseAvg = (band.min + band.max) / 2
  const geoAvg = (geo.min + geo.max) / 2
  const sectorMultiplier = sector.max
  return round5(baseAvg * geoAvg * sectorMultiplier)
}

export interface DriveTestOrder {
  package: string;
  currency: string;
  unitPrice: number;
  quantity: number;
  total: number;
  priceRange: {
    min: number;
    max: number;
  };
  selections: {
    revenueBand: {
      id: string;
      label: string;
    };
    geography: {
      id: string;
      label: string;
    };
    sector: {
      id: string;
      label: string;
    };
    riskProfile: number;
  };
  metadata: {
    locale: string;
    generatedAt: string;
    productName?: string;
    basePrice?: string;
    discountFromPrice?: string;
    macroSectorId?: string;
    macroSectorLabel?: string;
    sectorLevel?: "macro" | "granular";
  };
}

