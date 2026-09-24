# My collection of Userscripts

A grab bag of small userscripts I use day to day. To install any of them you need a
userscript-compatible browser or extension.

I personally use the almighty [qutebrowser](https://qutebrowser.org). You can otherwise use:

- [Greasemonkey](https://addons.mozilla.org/fr/firefox/addon/greasemonkey/) for [Firefox](https://firefox.com)
- [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) for [Chrome](https://www.google.fr/chrome)
- [Userscripts](https://github.com/quoid/userscripts/tree/main) for [Safari](https://www.apple.com/safari)

## Scripts

| Script | Description | |
| --- | --- | --- |
| **CMC Auto-fill login** | Auto-fills the ChooseMyCompany login form, picking the right credentials based on the environment (local, preprod, prod). | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/cmc-autofill-login.user.js) |
| **CMC Auto-fill survey** | Fills a ChooseMyCompany Happy survey with random answers for quick testing. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/cmc-autofill-survey.user.js) |
| **GitHub Code Background Dark Orange** | Restyles `<code>` and `<tt>` tags inside `.markdown-body` with a dark orange background so inline code is easier to spot on GitHub. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/github-code-highlight.user.js) |
| **GitHub "View all" button** | Adds a "View all" button to a GitHub pull request review page that ticks every "Viewed" checkbox at once. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/github-view-all-button.user.js) |
| **Instagram Popup Closer** | Automatically clicks the close (X) button of Instagram's signup/login upsell popup as soon as it appears, while leaving the real modals (posts, comments) untouched. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/instagram-popup-closer.user.js) |
| **JobTeaser Company Sucker** | Paginates through JobTeaser's company listing, collects all unique company names, and exports them as a CSV. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/jobteaser-company-vacum.user.js) |
| **Lucca planning toggle** | Adds a toggle button on the Lucca absence planning to hide/show collaborators who aren't in the office today (remote work or leave). | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/lucca-planning-toggle.user.js) |
| **Lucca trombinoscope hide** | Adds a button on each Lucca directory photo to hide that person, and a button next to "Organigramme" to show everyone again. Hidden people are remembered by name in `localStorage`. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/lucca-trombi-hide.user.js) |
| **Parabol user filter** | Adds a user selector on Parabol boards to display only the cards belonging to one chosen user. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/parabol-user-filter.user.js) |
| **RGPD Auto-Refuse** | Automatically refuses every toggle in RGPD/GDPR cookie consent modals and confirms the choice. Built around a small handlers system so support for new consent providers can be added by appending one entry. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/rgpd-auto-refuse.user.js) |
| **Trello cost counter for Costello** | Adds the total cost of each Trello list next to the list title. See [screenshot](#trello-cost-counter-for-costello) below. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/trello-cost-counter.user.js) |
| **Youtube redirect to Invidious** | Redirects any Youtube watch URL to the equivalent Invidious URL. | [Install](https://raw.githubusercontent.com/slashome/userscripts/main/scripts/youtube-redirect.user.js) |

## Screenshots

### Trello cost counter for Costello

![Trello cost counter exemple](https://raw.githubusercontent.com/slashome/userscripts/main/screenshots/trello-cost-counter.png "Trello cost counter exemple")
