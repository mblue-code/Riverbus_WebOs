# Publishing Checklist (Enact MVP)

1. **Versioning**
   - Update `enact-mvp/appinfo.json` with the new version number.
   - Update `enact-mvp/package.json` version if desired (for npm alignment).

2. **Build & package**
   ```bash
   cd enact-mvp
   npm install
   npm run pack
   cd ..
   ares-package enact-mvp/dist enact-mvp/services enact-mvp/appinfo.json --outdir dist
   ```

3. **QA on target devices**
   - Install on webOS 4.x and webOS 24 TVs: `ares-install --device tvXXXX dist/*.ipk`
   - Verify login, home screen, and any playback/chat functionality.
   - Check logs for service errors (`ares-inspect`).

4. **Assets**
   - Ensure `enact-mvp/resources/icon.png` and `largeIcon.png` meet LG requirements (80×80, 130×130).
   - Splash/background images can be added if needed (update `appinfo.json`).

5. **Documentation**
   - Update `README.md` if scope/features changed.
   - Keep release notes for the team or store submission.

6. **Submission / Distribution**
   - Side-load via Developer Mode for testing.
   - For LG Content Store submission, follow LG’s packaging guidelines (test cases, compliance docs).

7. **Post-release**
   - Monitor logs or user feedback for service errors (especially login).
   - Plan follow-up releases for new features (catalog, player, chat, etc.).
