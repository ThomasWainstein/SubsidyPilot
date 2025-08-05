# AgriTool MVP

> **Live Project:** [https://lovable.dev/projects/3707732f-d16c-415b-9774-90470307d385](https://lovable.dev/projects/3707732f-d16c-415b-9774-90470307d385)

A comprehensive agricultural subsidy management platform that extracts, categorizes, and presents French agricultural subsidies with AI-powered document processing and real-time data extraction.

## 🚀 Quick Start

### Prerequisites

- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Python 3.8+ with `python-dotenv` for scraper scripts

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

## 🔧 Environment Configuration

### Required Environment Variables

Before running any scraper or upload scripts, set these required variables:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SCRAPER_RAW_GPT_API="your-openai-api-key"
```

> **Note:** `SCRAPER_RAW_GPT_API` provides the OpenAI API key used by the extraction pipeline.

### Local Development Setup

1. Copy `.env.example` to `.env`
2. Fill in your environment values
3. Scripts will auto-load `.env` if `python-dotenv` is installed

### Frontend Environment (Vite)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |

**Note:** The application will throw an error during startup if either variable is missing.

### Backend/Scraper Environment

| Variable | Description | Usage |
|----------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Server-side & Python scraper |
| `NEXT_PUBLIC_SUPABASE_ANON` | Supabase anonymous key | Server-side & Python scraper |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Server-side operations |

> **Security:** Backend variables must remain secret. Set them as GitHub Secrets or in your `.env` file.

### Supabase Configuration

Configure your Supabase project secrets:

```bash
supabase secrets set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
                    NEXT_PUBLIC_SUPABASE_ANON=your-anon-key
```

See `.env.example` for a complete template.

## 🛠️ Technology Stack

This project is built with modern web technologies:

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool and development server |
| **TypeScript** | Type-safe JavaScript development |
| **React** | Frontend UI framework |
| **shadcn-ui** | Modern React component library |
| **Tailwind CSS** | Utility-first CSS framework |
| **Supabase** | Backend-as-a-Service (database, auth, storage) |
| **Python** | Data extraction and processing pipeline |
| **OpenAI API** | AI-powered document analysis |

## 📝 Development Options

### Option 1: Lovable Platform (Recommended)

Simply visit the [Lovable Project](https://lovable.dev/projects/3707732f-d16c-415b-9774-90470307d385) and start prompting.

**Benefits:**
- ✅ Changes automatically committed to this repo
- ✅ Instant preview and deployment
- ✅ No local setup required
- ✅ AI-assisted development

### Option 2: Local IDE Development

**Setup:**
1. Clone this repository
2. Install dependencies: `npm i`
3. Start development: `npm run dev`
4. Push changes (will be reflected in Lovable)

### Option 3: GitHub Direct Editing

1. Navigate to desired file(s)
2. Click the "Edit" button (pencil icon)
3. Make changes and commit

### Option 4: GitHub Codespaces

1. Go to repository main page
2. Click "Code" button (green)
3. Select "Codespaces" tab
4. Click "New codespace"
5. Edit and commit directly in browser

## 🤖 AI-Powered Features

### Document Classification System

The project uses a lightweight text classification model to categorize uploaded documents:

- **Review corrections** stored as audit records
- **Training pipeline** runs in simulation mode during development
- **Human review interface** for quality assurance

> **Details:** See `CLASSIFICATION_AUDIT_AND_SIMULATION.md` for configuration instructions.

### Extraction Pipeline

- **Multi-tab extraction** for complex document processing
- **AI-powered content analysis** using OpenAI API
- **Structured data output** with validation
- **Real-time processing** and feedback

## 🔥 Selenium 4+ Compliance

> **⚠️ ZERO TOLERANCE POLICY:** This project maintains strict compliance with Selenium 4+ patterns. Legacy code will cause build failures.

### ✅ Required Patterns (ONLY ALLOWED)

#### Chrome Driver

```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions

options = ChromeOptions()
service = ChromeService(driver_path)
driver = webdriver.Chrome(service=service, options=options)
```

#### Firefox Driver

```python
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.firefox.options import Options as FirefoxOptions

options = FirefoxOptions()
service = FirefoxService(driver_path)
driver = webdriver.Firefox(service=service, options=options)
```

### ❌ Forbidden Patterns (WILL CAUSE BUILD FAILURE)

```python
# ❌ FORBIDDEN - Multiple positional arguments
driver = webdriver.Chrome(driver_path, options=options)
driver = webdriver.Firefox(driver_path, options=options)

# ❌ FORBIDDEN - Legacy options keywords
driver = webdriver.Chrome(chrome_options=options)
driver = webdriver.Firefox(firefox_options=options)

# ❌ FORBIDDEN - Deprecated executable_path
driver = webdriver.Chrome(executable_path=path, options=options)
driver = webdriver.Firefox(executable_path=path, options=options)
```

### Enforcement & Validation

**Automated Enforcement:**
- 🔍 All PRs scanned by validator
- 🚫 Violations block merges and deploys
- ⚡ Zero tolerance policy: Any forbidden pattern = immediate build failure

**Before Committing:**
```bash
python AgriToolScraper-main/validate_selenium_compliance.py
```

**Requirements:** See `COMPLIANCE_MANIFEST.md` for complete details.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **Project Documentation** | Architecture and setup guides |
| **Human Review Interface Guide** | UI workflow documentation |
| **Classification and Simulation Overview** | AI model documentation |
| `CLASSIFICATION_AUDIT_AND_SIMULATION.md` | Simulation mode configuration |
| `COMPLIANCE_MANIFEST.md` | Selenium compliance requirements |

## 🚀 Deployment

### Quick Deploy

1. Open [Lovable](https://lovable.dev/projects/3707732f-d16c-415b-9774-90470307d385)
2. Click **Share** → **Publish**
3. Your app is live! 🎉

### Custom Domain

1. Navigate to **Project** → **Settings** → **Domains**
2. Click **Connect Domain**
3. Follow the setup wizard

📖 **Guide:** [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 🧑‍💻 For New Contributors

### Getting Started

1. **Read compliance rules** above (Selenium 4+ required)
2. **Run validation** before each commit
3. **Follow TypeScript patterns** for frontend code
4. **Test locally** before pushing

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Run compliance validation: `python AgriToolScraper-main/validate_selenium_compliance.py`
4. Commit and push: `git push origin feature/your-feature`
5. Create Pull Request

### Code Standards

- **Frontend:** TypeScript + React + Tailwind CSS
- **Backend:** Python with type hints
- **Database:** Supabase with TypeScript types
- **Scraping:** Selenium 4+ compliance required

## 📊 Project Stats

![Languages](https://img.shields.io/badge/TypeScript-72.1%25-blue)
![Languages](https://img.shields.io/badge/Python-27.4%25-green)
![Languages](https://img.shields.io/badge/PLpgSQL-0.4%25-orange)
![Languages](https://img.shields.io/badge/CSS-0.1%25-purple)


## Phase 1 CLI Usage

These scripts provide a minimal scraping workflow for development.

```bash
# Validate arguments and environment
python validate_pipeline.py --mode scraping --site franceagrimer --max-pages 1

# Run the scraper in dry-run mode
python main.py --mode scraping --site franceagrimer --max-pages 1 --dry-run

# Run a demo (scraping + AI placeholder)
python main.py --mode demo
```
## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

We welcome contributions! Please:

1. Check existing issues and PRs
2. Follow our coding standards
3. Run compliance validation
4. Submit well-documented PRs

---

**Built with ❤️ using Lovable, React, and modern web technologies**
