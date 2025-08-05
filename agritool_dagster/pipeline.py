"""Dagster job and ops orchestrating AgriTool scraping and AI processing."""

from dagster import Field, In, Out, job, op


@op(out=Out(dict))
def load_batch():
    """Load a batch of items to process."""
    return {"items": []}


@op(
    ins={"batch": In(dict)},
    out=Out(dict),
    config_schema={
        "site": Field(str, default_value="franceagrimer", description="Target site"),
        "max_pages": Field(int, default_value=1, description="Pages to scrape"),
        "dry_run": Field(bool, default_value=True, description="Run without network"),
    },
)
def scrape_country_agency(context, batch):
    """Stub scraping op returning dummy data."""
    cfg = context.op_config
    context.log.info(
        "Scraping %s pages=%s dry_run=%s",
        cfg["site"],
        cfg["max_pages"],
        cfg["dry_run"],
    )
    return {
        "site": cfg["site"],
        "pages": cfg["max_pages"],
        "dry_run": cfg["dry_run"],
        "data": batch,
    }


@op(
    ins={"scraped": In(dict)},
    out=Out(dict),
    config_schema={
        "model": Field(str, default_value="gpt-4", description="AI model"),
        "language": Field(str, default_value="en", description="Prompt language"),
    },
)
def process_batch_with_ai(context, scraped):
    """Simulate AI processing for the scraped batch."""
    cfg = context.op_config
    context.log.info(
        "Processing with model=%s language=%s", cfg["model"], cfg["language"]
    )
    return {"model": cfg["model"], "language": cfg["language"], "input": scraped}


@op(ins={"processed": In(dict)}, out=Out(dict))
def validate_outputs(context, processed):
    """Validate processed data and return final structure."""
    context.log.info("Validating processed output")
    return {"status": "ok", "result": processed}


@job
def agritool_pipeline():
    """Run the full scraping and AI pipeline."""
    batch = load_batch()
    scraped = scrape_country_agency(batch)
    processed = process_batch_with_ai(scraped)
    validate_outputs(processed)
