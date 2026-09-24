# First Light privacy policy

_Last updated: 24 September 2026_

First Light is a desktop app that runs entirely on your Mac. It has no server, no account system of its own, no analytics and no tracking.

## What First Light accesses

- **Email (read-only).** When you connect Gmail with Google sign-in, First Light requests `gmail.readonly` to show sender, subject, a short preview and labels for recent inbox messages. With other providers it reads the same information over IMAP using an app password you provide. It never sends, changes, moves or deletes email.
- **Calendar (read-only).** With Google sign-in it requests `calendar.readonly` to show today's events. It can also read iCal links you paste in.
- **Your Google profile.** Your name and email address, to label your account.

## Where your data goes

- Email and calendar data are fetched directly from Google or your email provider to your Mac and are stored only on your Mac. They are never sent to the developer, to Anthropic or to anyone else.
- Sign-in tokens, app passwords and your Anthropic API key are encrypted using the macOS Keychain.
- To write the morning brief, First Light sends Anthropic (the Claude API, using your own API key) the news headlines it collected and your brief preferences. It does not send your email, calendar or to-dos.
- The weather is fetched from Open-Meteo using the city you choose. News is fetched from Google News and the RSS feeds you add.

## Google API Services

First Light's use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements. Google user data is used only to show you your own inbox and calendar inside the app, is not transferred to anyone, is not used for advertising and is not used to train AI models.

## Removing your data

Settings → Account → **Remove from this Mac** signs out of every account, revokes Google access and deletes everything First Light stored. You can also revoke access at any time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

## Contact

Questions: open an issue on the project's GitHub page.
