# CI/CD & pipelines

Free hosted CI/CD allowances and self-hosted build automation. Self-hosted software may be free to use, but runner and infrastructure costs are separate. [← Back to directory](../README.md)

**Editorial review:** 2026-10-19 (UTC). Provider limits and terms may change; check official sources before using them.

| Service | Plan | Free allowance | Important caveat | Card | Commercial use |
| --- | --- | --- | --- | --- | --- |
| [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | Ongoing free allowance | Standard GitHub-hosted runners free for public repos; 2,000 minutes/month on GitHub Free private repos | Larger runners and over-quota private-repo usage may be billed. | Not required | Check provider |
| [GitLab CI/CD Free](https://docs.gitlab.com/ci/pipelines/compute_minutes/) | Ongoing free allowance | 400 compute minutes/month per GitLab.com Free namespace on hosted instance runners | Runner cost factors vary; quota is shared across the namespace; extra compute minutes may need purchase. | Check provider | Check provider |
| [CircleCI Free](https://circleci.com/pricing/) | Ongoing free allowance | 30,000 credits/month; up to 5 active users; 1 GB network transfer and 2 GB-month storage | Free credits expire monthly and do not roll over; resource classes consume credits at different rates; personal builds stop when credits reach zero. | Not required | Check provider |
| [Crow CI](https://crowci.com/) | Ongoing free allowance | Apache-2.0 open-source CI/CD for self-hosted pipelines; no software-enforced build-minute or pipeline-run quotas, with Docker, Podman, Kubernetes and other agent backends. | Self-hosted only: provide and pay for your own servers/runners, storage and networking; capacity and costs depend on your infrastructure. No managed free runner allowance is included. | Not required | Allowed |

> **Important:** “Check provider” means not independently confirmed in this catalog. Crow CI does not include free hosted runners; its self-hosted software is Apache-2.0 licensed.
