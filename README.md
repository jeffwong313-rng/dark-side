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

## 3D mode (optional)
**Settings → Graphics → 3D mode** switches the whole game to a voxel 3D look: a full-screen road map where the party walks up, left or right to the next node, Pokémon-style 3D battles (heroes bottom left, monsters top right), a 3D town, and 3D versions of every piece of equipment. Switch it off at any time to go back to the pixel art; saves are shared by both modes. A quality option (Battery saver / Balanced / Best quality) is next to it. The 3D engine (`lib/three.min.js` and the `d3/` folder) only downloads when 3D mode is on, and if anything goes wrong the game falls back to 2D by itself.
