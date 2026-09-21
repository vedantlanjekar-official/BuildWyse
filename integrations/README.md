# BuildWyse Integrations

External service adapters used by the FastAPI backend.

## Quick links

- Deployment: [docs/architecture/DEPLOYMENT.md](../docs/architecture/DEPLOYMENT.md)
- Product workflows: [000_WORKFLOWS_AND_MODULE_CONNECTIONS.md](../000_WORKFLOWS_AND_MODULE_CONNECTIONS.md)

## Modules

| Package | Purpose | Default mode |
|---------|---------|--------------|
| `integrations/github/` | Repository connection, OAuth | Requires `GITHUB_CLIENT_ID/SECRET` |
| `integrations/payments/` | Milestone payments, commission | `PAYMENT_MODE=sandbox` |
| `integrations/email/` | Transactional email | `EMAIL_MODE=console` or `resend` |
| `integrations/identity/` | KYC / identity verification | `IDENTITY_MODE=simulated` |

## Environment variables

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

PAYMENT_PROVIDER_KEY=
PAYMENT_PROVIDER_SECRET=
PAYMENT_MODE=sandbox

EMAIL_API_KEY=
EMAIL_MODE=console
EMAIL_FROM=BuildWyse <onboarding@resend.dev>
CONTACT_TO_EMAIL=vedantlanjekar456@gmail.com

IDENTITY_MODE=simulated
```

For live contact-form delivery:

1. Create an API key at [resend.com/api-keys](https://resend.com/api-keys)
2. Set `EMAIL_MODE=resend` and `EMAIL_API_KEY=re_...`
3. Keep `EMAIL_FROM=BuildWyse <onboarding@resend.dev>` until a domain is verified, then switch to your domain
4. Contact submissions are emailed to `CONTACT_TO_EMAIL`

All integrations degrade gracefully in development — sandbox/console/simulated modes require no external credentials.

## Import path

Same as `ai/` — repo root on `sys.path`:

```python
from integrations.payments.sandbox import SandboxPaymentProvider
```
