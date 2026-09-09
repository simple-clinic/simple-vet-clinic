# Simple Vet Clinic

An independent veterinary clinic management system for Cloudflare Workers.

## Included modules

- Animal and owner registration with duplicate-patient merging
- Disease, surgery, routine examination, diagnostics, and grooming visits
- Vaccination, deworming, and preventive-care reminders
- Inventory, sales, expiry alerts, monthly finance, boarding, and 25 cages
- Archive, edit, delete, restore, import, export, and print workflows
- Public owner portal using phone number and animal name
- Configurable branding, colors, logos, content, visibility, and ambient effects

## Cloudflare resources

- Worker: `simple-vet-clinic`
- D1 database: `simple-vet-db`
- R2 bucket: `simple-vet-media`
- Secrets: `CLINIC_ADMIN_PASSWORD` and `CLINIC_SESSION_SECRET`

The D1 `database_id` in `wrangler.jsonc` is intentionally a placeholder. Replace
it with the ID returned when `simple-vet-db` is created in the destination
Cloudflare account. Add the final custom domain only after the application has
been deployed and verified on its temporary Workers address.

## Commands

```bash
npm ci
npm run build
npm test
```

This project contains no LEO VET patient data and does not use the LEO VET
database, media bucket, domain, session cookie, or branding defaults.
