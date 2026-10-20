# Single entry point. Targets used by CI only check; they never modify the repository.
# This project has no AWS deployment: synth, deploy and destroy are explicit no-ops (see README).
.PHONY: help preflight setup lint test test-unit test-e2e links synth deploy verify destroy verify-cleanup scan clean

help: ## List targets
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | sed -E 's/:.*## /\t/'

preflight: ## Read-only check of the local tool chain
	node tools/preflight.mjs

setup: ## Install the demo test dependencies and Chromium (no global installs)
	npm run setup:e2e

lint: ## Syntax, JSON and text hygiene checks (read-only)
	node tools/lint.mjs

test: ## Unit tests and browser tests
	npm test

test-unit: ## Unit tests only
	npm run test:unit

test-e2e: ## Browser tests only
	npm run test:e2e

links: ## Reachability of official links cited in the docs (needs network)
	npm run check:links

synth: ## Not applicable: no infrastructure as code in this project
	@echo "synth: not applicable (no AWS deployment, see DEPLOYMENT-LOG.md)"

deploy: ## Not applicable: nothing is deployed to AWS
	@echo "deploy: not applicable (no AWS deployment, see DEPLOYMENT-LOG.md)"

verify: lint test links ## Everything a reviewer should run

destroy: ## Not applicable: nothing is deployed to AWS (local cleanup: make clean)
	@echo "destroy: not applicable (no AWS deployment, see DEPLOYMENT-LOG.md)"

verify-cleanup: ## Read-only AWS residue check by prefix and tag; non-zero exit on residue
	bash tools/verify-cleanup.sh

scan: ## gitleaks over the full history plus a canary that must be detected
	bash tools/scan-secrets.sh

clean: ## Remove local dependencies and test output (asks for confirmation)
	bash tools/cleanup-local.sh
