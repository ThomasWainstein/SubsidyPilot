# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/3707732f-d16c-415b-9774-90470307d385

## Required Environment Variables

Before running any scraper or upload scripts, set these required variables:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SCRAPER_RAW_GPT_API="your-openai-api-key"
```

`SCRAPER_RAW_GPT_API` provides the OpenAI API key used by the extraction pipeline.

For local development, copy `.env.example` to `.env` and fill in your values. Scripts will auto-load `.env` if `python-dotenv` is installed.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3707732f-d16c-415b-9774-90470307d385) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Variables

This project uses two sets of Supabase credentials:

### Frontend (Vite)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Both values are **required**. The application will throw an error during startup if either variable is missing.

### Backend / Scraper
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON`
- `SUPABASE_SERVICE_ROLE_KEY`

Frontend variables are safe to expose in the browser. Backend variables, including
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON`, must remain secret and
are used only by server-side code and the Python scraper. Set them as GitHub
Secrets or in your `.env` file.
See `.env.example` for a full template. Configure your Supabase project secrets with:

```bash
supabase secrets set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
                    NEXT_PUBLIC_SUPABASE_ANON=your-anon-key
```

## Documentation

- [Project Documentation](docs/README.md)
- [Human Review Interface Guide](docs/features/human-review.md)

## Classification and Simulation Overview

The project uses a lightweight text classification model to categorize uploaded
documents. Review corrections are stored as audit records, and parts of the
training pipeline run in simulation mode during development. For more details
and instructions on enabling or disabling the simulation flag, see
`CLASSIFICATION_AUDIT_AND_SIMULATION.md`.

## 🔥 Selenium 4+ Compliance

This project maintains **ZERO TOLERANCE** for legacy Selenium WebDriver patterns. All code contributions must follow strict compliance rules.

### ✅ Required Patterns (ONLY ALLOWED)

```python
# Chrome Driver - REQUIRED PATTERN
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions

options = ChromeOptions()
service = ChromeService(driver_path)
driver = webdriver.Chrome(service=service, options=options)

# Firefox Driver - REQUIRED PATTERN
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

### Enforcement

**All PRs and new scripts are scanned by ruthless validator. Violations block all merges and deploys.**

Run validation before committing:
```bash
python AgriToolScraper-main/validate_selenium_compliance.py
```

See `COMPLIANCE_MANIFEST.md` for complete requirements.

## Onboarding for New Contributors

**IMPORTANT**: All code contributions must follow the Selenium 4+ compliance rules above.

- **Pre-commit hook and CI pipeline block any legacy WebDriver code**
- **Zero tolerance policy**: Any forbidden pattern causes immediate build failure
- **Required validation**: Run compliance check before each commit

See `COMPLIANCE_MANIFEST.md` for exact requirements.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3707732f-d16c-415b-9774-90470307d385) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
