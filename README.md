# side-nav
Run it on :  https://iproats.sharepoint.com/sites/SirvaDev/SitePages/Home.aspx?debugManifestsFile=https%3A%2F%2Flocalhost%3A4321%2Ftemp%2Fbuild%2Fmanifests.js&noredir=true&loadSPFX=true&customActions=%7B%2216b85c69-936d-4fef-9542-3425774ecd4b%22%3A%7B%22location%22%3A%22ClientSideExtension.ApplicationCustomizer%22%2C%22properties%22%3A%7B%22testMessage%22%3A%22Test+message%22%7D%7D%7D

OR 

file:///C:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/preview.html
## Summary

Short summary on functionality and used technologies.

[picture of the solution in action, if possible]

## Used SharePoint Framework Version

![version](https://img.shields.io/badge/version-1.23.2-green.svg)

## Applies to

- [SharePoint Framework](https://aka.ms/spfx)
- [Microsoft 365 tenant](https://docs.microsoft.com/sharepoint/dev/spfx/set-up-your-developer-tenant)

> Get your own free development tenant by subscribing to [Microsoft 365 developer program](http://aka.ms/o365devprogram)

### Summary of Work

I have created the SharePoint vertical mega menu navbar based on your mockup and generated the production-ready `.sppkg` package file.

---

### What Was Created

1. **Navigation Data Model & Configuration**:
   - [SideNavData.ts](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavData.ts): Defines TypeScript interfaces (`INavItem`, `IMegaMenuColumn`, `ISubMenuItem`) and default navigation items matching your mockup:
     - **Home**: Active state with cyan indicator strip (`#22d3ee`).
     - **Working here ›**: Interactive flyout with culture, workplace, and tech links.
     - **Pay & benefits ›**: Highlighted active/hover state with the 3-column mega menu card:
       - **YOUR PAY**: *Payslips and tax documents*, *Pay calendar 2026*, *Bonus and commission*, *Change your bank details*
       - **BENEFITS**: *Enrolment 2027*, *Health and insurance*, *Pension and savings*, *Family and parental leave*
       - **WHO CAN HELP**: *Your local HR team*, *Payroll service desk*, *Ask a question*
     - **Learning ›**: Development, Training, and Resources flyout.
     - **Countries** and **News**.

2. **Navbar Renderer & Design System**:
   - [SideNavRenderer.ts](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavRenderer.ts):
     - **Top Bar**: Deep midnight indigo background (`#15083f`), branded `sirvalife` logo with SVG orbital gradient swirl mark.
     - **Left Rail**: 220px fixed vertical rail with item list and collapse/expand toggle.
     - **Flyout Card**: White card with rounded corners (`10px`), elevation shadow, 3-column grid layout, uppercase magenta headers (`#a855f7`), and link hover effects.
     - **SharePoint Layout Shift**: Shifts modern SharePoint canvas (`#spPageCanvasContent`, `[data-automation-id="contentScrollRegion"]`) by 220px so content sits alongside the rail.

3. **SPFx Application Customizer**:
   - [SideNavSharepointApplicationCustomizer.ts](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavSharepointApplicationCustomizer.ts):
     - Connects to modern SharePoint placeholders (`PlaceholderName.Top`) and listens to SPA page transitions (`navigatedEvent`).
     - Supports optional custom JSON override via component properties (`navItemsJson`).

4. **Standalone Interactive Preview**:
   - [preview.html](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/preview.html): A standalone file that you can double-click to view the exact navbar, test hover interactions, and see the full-bleed banner.

5. **Ready-to-Deploy SharePoint Package**:
   - Package path: [side-nav.sppkg](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/sharepoint/solution/side-nav.sppkg)
   - Built with SPFx 1.23.2, client-side assets included (`includeClientSideAssets: true`).

---

### Package File Details

| Item | Details |
| :--- | :--- |
| **Package File** | `sharepoint/solution/side-nav.sppkg` |
| **Full Path** | `c:\Users\Muskan Gupta\Desktop\SideNavSharepoint\sharepoint\solution\side-nav.sppkg` |
| **Build Status** | **0 errors, 0 warnings** |
| **Deployment Mode** | Tenant-wide or Site Collection App Catalog |

---

### How to Deploy to SharePoint

1. Open your **SharePoint Tenant App Catalog** (or Site Collection App Catalog).
2. Drag and drop [side-nav.sppkg](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/sharepoint/solution/side-nav.sppkg) into the **Apps for SharePoint** library.
3. In the prompt, check **"Enable this app and add it to all sites"** (or add it specifically to your target site).
4. Click **Deploy**.

> **Browser Environment Notice**: The automated headless browser subagent encountered an external network error downloading the Playwright browser driver (`404 Not Found from playwright.azureedge.net`). You can open [preview.html](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/preview.html) in your local Edge or Chrome browser to view and interact with the navbar.



Created PROJECT_SUMMARY.md

I have created a comprehensive summary document for you:

### **[PROJECT_SUMMARY.md](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/PROJECT_SUMMARY.md)**

---

### Quick Overview of What Each Key File Does

1. **[`SideNavData.ts`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavData.ts)**
   - Defines the TypeScript interfaces (`INavItem`, `IMegaMenuColumn`, `ISubMenuItem`).
   - Contains all navigation data matching the mockup, including:
     - `Home` (cyan active state).
     - `Working here ›` (culture, workplace, tools submenus).
     - `Pay & benefits ›` (exact 3 columns: **YOUR PAY**, **BENEFITS**, **WHO CAN HELP**).
     - `Learning ›`, `Countries`, and `News`.

2. **[`SideNavRenderer.ts`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavRenderer.ts)**
   - Renders the brand top bar with the `sirvalife` SVG logo.
   - Generates the 220px fixed vertical rail and smooth mega menu flyout panel.
   - Applies the color system (midnight purple `#15083f`, cyan `#22d3ee`, purple `#a855f7`).
   - Dynamically shifts SharePoint modern page content (`margin-left: 220px`) and handles flyout mouse debounce and rail collapse.

3. **[`SideNavSharepointApplicationCustomizer.ts`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavSharepointApplicationCustomizer.ts)**
   - The SPFx Application Customizer entry point.
   - Hooks into `PlaceholderName.Top` and SharePoint SPA page transitions (`navigatedEvent`).

4. **[`side-nav.sppkg`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/sharepoint/solution/side-nav.sppkg)**
   - The **compiled, production SharePoint deployment package**.
   - Client-side assets are bundled directly inside, ready to drag and drop into your SharePoint App Catalog.

5. **[`preview.html`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/preview.html)**
   - A standalone HTML file you can double-click to immediately test and interact with the navbar locally in Edge or Chrome.

6. **[`config/package-solution.json`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/config/package-solution.json)** & **[`sharepoint/assets/`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/sharepoint/assets/)**
   - SPFx solution configuration and XML feature elements (`ClientSideInstance.xml`, `elements.xml`) for site/tenant provisioning.

For the full detailed explanation, specifications, and deployment steps, open [PROJECT_SUMMARY.md](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/PROJECT_SUMMARY.md).
