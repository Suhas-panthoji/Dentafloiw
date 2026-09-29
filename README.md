---
title: DentaFlow
emoji: 🦷
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# DentaFlow — Dental Practice Management Suite

1st real world project I'm working on... which is going to be used by clients.

## Deployment on Hugging Face Spaces

This application is ready to be hosted as a **Docker Space** on Hugging Face.

### Configuration
Make sure your environment variables are configured on the Hugging Face Space settings page under **Repository Secrets** (do not commit them to the repository for security):

- `MONGO_URL`: Your MongoDB Atlas Connection String
- `DB_NAME`: Your MongoDB Database Name (e.g. `dentaflow_db`)
- `JWT_SECRET`: A secure random string for JWT auth
- `DOCTOR_EMAIL`: Default doctor login email
- `DOCTOR_PASSWORD`: Default doctor login password
- `STAFF_EMAIL`: Default staff login email
- `STAFF_PASSWORD`: Default staff login password
- `ADMIN_EMAIL`: Initial administrator login email
- `ADMIN_PASSWORD`: Initial administrator password
- `CLOUDINARY_CLOUD_NAME`: `girjx2b4`
- `CLOUDINARY_API_KEY`: `785154621536711`
- `CLOUDINARY_API_SECRET`: `IWUSx1DA2LgQdIPREcpKb84wXl0`
- `CORS_ORIGINS`: `*`

The administrator has doctor-level clinic access and can manage user accounts at **Accounts**. Accounts, roles, and password changes are stored securely in MongoDB; passwords are never displayed and environment secrets are not modified through the web app.
