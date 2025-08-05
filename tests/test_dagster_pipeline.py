from agritool_dagster.pipeline import agritool_pipeline


def test_pipeline_executes():
    result = agritool_pipeline.execute_in_process(
        run_config={
            "ops": {
                "scrape_country_agency": {
                    "config": {
                        "site": "franceagrimer",
                        "max_pages": 1,
                        "dry_run": True,
                    }
                },
                "process_batch_with_ai": {
                    "config": {"model": "gpt-4", "language": "fr"}
                },
            }
        }
    )
    assert result.success
    assert result.output_for_node("validate_outputs")["status"] == "ok"
