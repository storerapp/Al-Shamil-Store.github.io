# Render Production Setup

1. Commit the repository containing this V8.
2. Render → New → Blueprint.
3. Connect the GitHub repository.
4. Select the branch containing `render.yaml`.
5. Review:
   - `al-shamil-vault`
   - `al-shamil-vault-db`
6. Apply Blueprint.
7. Wait for Postgres + migration + web deploy.
8. Verify `/health` returns `database: CONNECTED`.
9. Open `/admin.html` and use the generated `ADMIN_KEY` from Render Environment.
10. Configure inventory before enabling the public event.

Render HTTP health checks can block traffic until the service is healthy. The V8 health endpoint performs a database query, so a database failure prevents a healthy status.

For actual production, the smallest paid Postgres plan is `basic-256mb`; Render currently also documents a free Postgres tier with time limitations, so the paid plan is the safer choice for a real contest.
