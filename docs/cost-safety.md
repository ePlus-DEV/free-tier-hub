# Free-tier cost and data safety

[← Directory](../README.md) · [Example stacks](use-cases.md)

Free quotas are not guarantees of zero cost, reliability or permanent data retention. Check a provider's official terms before using a service.

## Before opening an account

- **Free plan vs credits:** Separate indefinite allowances from recurring credits, time-limited trials and individual resources with expiration dates.
- **Billing:** Confirm whether a payment card is required and whether excess usage is blocked, paused or charged. An email alert is not a spending cap.
- **Regions and traffic:** Ensure your selected region qualifies and confirm outbound traffic costs.
- **Commercial rights:** A personal free tier may prohibit client workloads or business use.

## Before production traffic

- **Inactivity:** Identify app sleeping, paused databases, reclaimed VMs, cold starts and expiration dates.
- **Durability:** Export important data on a schedule and test restoring it; do not presume free backups exist.
- **Counting units:** Track queue reads, writes, deletes, retries and workflow steps separately from job count.
- **Security:** Give webhooks authenticated endpoints, use least-privilege API keys and never commit secrets.
- **Quota monitoring:** Compare API, storage, request, compute and egress limits and implement safe failure modes.

For updates to this catalog, include official provider documentation and the date actually verified; use `check` when a policy is not confirmed.
