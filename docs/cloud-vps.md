# Cloud compute & VPS

VMs and general-purpose cloud infrastructure. [← Back to directory](../README.md)

**Editorial review:** 2026-09-22 (UTC). Provider prices and limits may change; open each official source for the current terms.

| Service | Plan | Free allowance | Important caveat | Card | Commercial use |
| --- | --- | --- | --- | --- | --- |
| [Oracle Cloud Always Free Compute](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) | Ongoing free allowance | Always Free: up to two AMD E2.1.Micro VMs (1/8 OCPU, 1 GB RAM each); Arm Ampere A1: 1,500 OCPU-hours and 9,000 GB-hours/month (equivalent to 2 OCPUs and 12 GB RAM for Always Free tenancies); 200 GB shared boot/block volume storage. | Compute must run in the home region; capacity may be unavailable and idle instances may be reclaimed. Payment card required for account verification. Boot volumes use the shared 200 GB allowance; paid account overages can incur charges. Verify tenancy-specific A1 limits. | Required | Check provider |
| [Google Compute Engine Free Tier](https://docs.cloud.google.com/free/docs/free-cloud-features) | Ongoing free allowance | One eligible e2-micro VM/month; 30 GB standard disk; 1 GB eligible egress | Only selected US regions qualify; billing account required; other usage can be charged. | Required | Check provider |
| [AWS Free Plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-FAQ.html) | Time-limited | Eligible new accounts: up to six months or until Free Tier credits run out | NOT an indefinite free VPS; different AWS offers have separate eligibility and limits. | Check provider | Check provider |

> **Important:** “Check provider” means not independently confirmed in this catalog. It does **not** mean a credit card or commercial use is necessarily permitted.
