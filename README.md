# Dark Side of the Moon (installable app)

Upload every file in this folder to a GitHub repository with GitHub Pages turned on. You'll get a link you can install as a full-screen app.

## Put it on GitHub (about 5 minutes, all in Chrome)

1. Go to https://github.com/new. Name the repository `dark-side` and choose **Public**. Click **Create repository**.
2. On the new repository page, click **uploading an existing file**.
3. Drag in the contents of this folder: `index.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll` and the `icons` folder. Click **Commit changes**.
   - If `.nojekyll` doesn't show up (hidden files), skip it. It's optional.
4. Go to **Settings → Pages**. Under "Build and deployment", pick **Deploy from a branch**, branch **main**, folder **/ (root)**. Click **Save**.
5. Wait a minute or two. Your game will be at `https://YOUR-USERNAME.github.io/dark-side/`

## Install it on your phone (Chrome on Android, including the Z Fold)

1. Open the link in Chrome.
2. Tap the menu (⋮) and choose **Install app** (or **Add to Home screen → Install**).
3. Launch it from the home screen icon. It opens full screen with no browser bars and works offline.

On iPhone, open the link in Safari and choose **Share → Add to Home Screen**.

## Bring your current town over

1. In the claude.ai version, open **Settings → Save file → Export save**, then **Copy code** (or **Download as file**).
2. In the installed app, open **Settings → Save file → Import save**, paste the code (or choose the file) and tap **Load this save**.

Each browser and the installed app keep their own saves, so export/import is also a handy backup.

## Updating the game later

Replace `index.html` and `sw.js` in the repository with new versions (**Add file → Upload files**, then commit). The installed app picks up the update the next time it opens with an internet connection.
