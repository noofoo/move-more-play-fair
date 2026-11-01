# Activity → Gaming Time

A small static website for tracking activity-earned gaming time. Deploy it with GitHub Pages.

## Features

- Admin settings for creating, editing, and deleting activities.
- Each activity has a reward ratio in **gaming minutes earned per 15 minutes of activity**.
- Activity reporting in 15-minute chunks, with `+15m`, `−15m`, `+1h`, and `−1h` buttons.
- Password-protected admin settings, including manual balance adjustments (gaming time used or extra time) in 15-minute and one-hour chunks.
- Daily earning limit for activity reports, resetting at midnight.
- Dark mode (default) with a light mode toggle.
- Optional balance cap, activity history, and JSON backup/restore.
- Mobile-friendly layout.

## Deploy to GitHub Pages

1. Create a GitHub repository, for example `activity-gaming-time`.
2. Upload `index.html`, `style.css`, `app.js`, and this `README.md` to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch `main` and folder `/(root)`, then click **Save**.
6. Wait for the deployment. GitHub will show the published URL in the Pages section.

No build step or package manager is required.

## Important limitations

This is a static, local-only version:

- Data is saved in `localStorage` in the browser that is being used.
- It does **not** sync between your phone and your son's device.
- The admin password is checked in the browser against a PBKDF2-SHA256 hash. This keeps the plain password out of the source, but it is not a secure login: anyone with browser developer tools can bypass the check or edit `localStorage` directly.
- Admin login requires HTTPS (GitHub Pages provides this) or `localhost`, because it uses the browser's Web Crypto API.
- The daily limit caps minutes *earned* from activities; actual play time is not automatically monitored.
- Export a JSON backup occasionally if you want to preserve the data.

For use across multiple devices with a genuinely protected admin role, the app would need a backend and authentication (for example, Supabase or Firebase). GitHub Pages alone cannot securely store shared private data or protect admin actions.
