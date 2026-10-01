# Sirva Life - SharePoint Vertical Mega Menu Navbar Project Summary

## 1. Executive Overview

This project implements the custom **Sirva Life Vertical Navbar & Mega Menu** as a **SharePoint Framework (SPFx 1.23.2)** extension with a 220px left navigation rail and interactive flyout mega menu.

The solution is packaged as a ready-to-deploy SharePoint app package:  
**`sharepoint/solution/side-nav.sppkg`**

---

## 2. File-by-File Breakdown

Below is a detailed explanation of what each file does in this project:

### A. Source Code (`src/extensions/sideNavSharepoint/`)

1. **[`SideNavData.ts`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavData.ts)**
   - **Role**: Data structures and default navigation configuration.
   - **Details**:
     - Defines TypeScript interfaces:
       - `ISubMenuItem`: Single link item with `title`, `url`, and optional `isExternal`.
       - `IMegaMenuColumn`: Column structure containing a `header` and a list of `items`.
       - `INavItem`: Top-level vertical rail item (`id`, `title`, `url`, `isActive`, `hasChevron`, `columns`).
     - Contains `DEFAULT_NAV_ITEMS` matching the design mockup:
       - **Home**: Active state by default with cyan accent.
       - **Working here ›**: Chevron item with submenus for *OUR CULTURE*, *WORKPLACE*, and *TOOLS & TECH*.
       - **Pay & benefits ›**: Highlighted active/hover state with the exact 3 columns from the screenshot:
         - **YOUR PAY**: *Payslips and tax documents*, *Pay calendar 2026*, *Bonus and commission*, *Change your bank details*.
         - **BENEFITS**: *Enrolment 2027*, *Health and insurance*, *Pension and savings*, *Family and parental leave*.
         - **WHO CAN HELP**: *Your local HR team*, *Payroll service desk*, *Ask a question*.
       - **Learning ›**: Submenus for *DEVELOPMENT*, *TRAINING*, and *RESOURCES*.
       - **Countries**: Direct navigation link.
       - **News**: Direct navigation link.

2. **[`SideNavRenderer.ts`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavRenderer.ts)**
   - **Role**: Presentation and interaction engine.
   - **Details**:
     - **CSS Ingestion (`injectStyles`)**: Dynamically injects scoped styles ensuring the exact color scheme:
       - Deep purple midnight background (`#15083f`).
       - Rail item hover background (`#29155f`) and active flyout highlight (`#2b1461`).
       - Cyan active indicator strip (`#22d3ee`).
       - Magenta-purple column headers (`#a855f7`).
       - Floating mega menu card styling with soft drop shadows and rounded corners.
       - SharePoint canvas adjustment (`margin-left: 220px`) to prevent navigation rail from overlapping modern page webparts.
     - **DOM Generation (`buildDom`)**: Constructs the top bar header, brand logo (crisp SVG swirl icon + `sirvalife` typography), left rail container, collapse toggle button, and mega menu container.
     - **Event Handling (`attachEvents`, `openFlyout`, `closeFlyout`)**:
       - Implements hover bridges (`::before` hit area) and debounced timeout closures (180ms) to ensure smooth mouse movement between rail items and flyout panels.
       - Supports click selection and keyboard accessibility (`Escape` key to close).
       - Provides expand/collapse rail toggle functionality.

3. **[`SideNavSharepointApplicationCustomizer.ts`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavSharepointApplicationCustomizer.ts)**
   - **Role**: SPFx extension lifecycle coordinator.
   - **Details**:
     - Inherits from `BaseApplicationCustomizer`.
     - Integrates with SharePoint placeholder system (`PlaceholderName.Top`).
     - Injects into the top placeholder or gracefully attaches to `document.body`.
     - Listens to SharePoint Single Page Application (SPA) navigation events (`navigatedEvent`) to ensure the navigation bar persists when browsing between pages without full page reloads.
     - Supports optional JSON overrides (`navItemsJson`) through SharePoint ClientSideComponent properties.

4. **[`SideNavSharepointApplicationCustomizer.manifest.json`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/SideNavSharepointApplicationCustomizer.manifest.json)**
   - **Role**: SPFx component registration manifest.
   - **Details**: Defines component ID (`16b85c69-936d-4fef-9542-3425774ecd4b`), alias, extension type (`ApplicationCustomizer`), and script permissions.

5. **[`loc/myStrings.d.ts`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/loc/myStrings.d.ts) & [`loc/en-us.js`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/src/extensions/sideNavSharepoint/loc/en-us.js)**
   - **Role**: Localization resources for the customizer title and labels.

---

### B. SharePoint Deployment & Solution Configuration

6. **[`config/package-solution.json`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/config/package-solution.json)**
   - **Role**: Solution package manifest.
   - **Details**: Sets `"includeClientSideAssets": true` (all JavaScript and CSS assets are bundled directly inside the `.sppkg` file, eliminating the need for external Azure storage/CDN), solution ID, features, and target package path (`solution/side-nav.sppkg`).

7. **[`sharepoint/assets/elements.xml`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/sharepoint/assets/elements.xml)**
   - **Role**: CustomAction provisioning XML.
   - **Details**: Binds the extension to `ClientSideExtension.ApplicationCustomizer` with the component ID.

8. **[`sharepoint/assets/ClientSideInstance.xml`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/sharepoint/assets/ClientSideInstance.xml)**
   - **Role**: Tenant-wide / site-level automatic instantiation manifest.

9. **[`sharepoint/solution/side-nav.sppkg`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/sharepoint/solution/side-nav.sppkg)**
   - **Role**: **The compiled, ready-to-deploy SharePoint package file.**
   - **Details**: Contains all compiled JavaScript bundles, manifests, and XML definitions. Ready to be dragged and dropped directly into your SharePoint App Catalog.

---

### C. Preview & Testing

10. **[`preview.html`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/preview.html)**
    - **Role**: Standalone local interactive preview.
    - **Details**: A zero-dependency HTML file that reproduces the entire layout, header bar, 220px vertical rail, interactive mega menu flyout, and mock hero banner. Can be opened immediately in any browser (Chrome, Edge, Firefox) by double-clicking.

---

### D. Project & Toolchain Configuration

11. **[`package.json`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/package.json)**: Node packages and scripts (`npm run build`, `npm run start`).
12. **[`tsconfig.json`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/tsconfig.json)**: TypeScript compiler settings.
13. **[`config/config.json`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/config/config.json)**: Webpack entry points and bundle mapping.
14. **[`config/serve.json`](file:///c:/Users/Muskan%20Gupta/Desktop/SideNavSharepoint/config/serve.json)**: Local debugging configuration with SharePoint workbench.

---

## 3. Visual & Interaction Specifications

| Feature | Specification / Value |
| :--- | :--- |
| **Left Rail Width** | Exactly `220px` (matches design constraint) |
| **Top Header Height** | `56px` to `58px` |
| **Dark Theme Colors** | Base: `#15083f` \| Hover: `#29155f` \| Active item: `#2b1461` |
| **Active Indicator** | Left border: `3.5px solid #22d3ee` \| Text: `#22d3ee` (Cyan) |
| **Mega Menu Panel** | White background (`#ffffff`), `10px` border-radius, soft elevation shadow |
| **Mega Menu Headers** | Magenta/purple (`#a855f7`), bold uppercase, tracking `0.08em` |
| **Mega Menu Items** | Slate charcoal (`#334155`), hover color `#7c3aed` with smooth translate |
| **SharePoint Layout** | Automatically shifts page canvas by `220px` to maintain content visibility |

---

## 4. How to Deploy the `.sppkg` File

1. Navigate to your **SharePoint Admin Center** (`https://<tenant>-admin.sharepoint.com`).
2. Go to **More features** > **Apps** (or your **Tenant App Catalog** site: `.../sites/appcatalog`).
3. Open the **Apps for SharePoint** library.
4. Drag and drop the file:  
   **`c:\Users\Muskan Gupta\Desktop\SideNavSharepoint\sharepoint\solution\side-nav.sppkg`**
5. In the trust dialog:
   - Check **"Enable this app and add it to all sites"** (for tenant-wide deployment), OR
   - Approve it for individual site installations.
6. Click **Deploy**. The navbar will now render automatically across your modern SharePoint pages.

---

## 5. How to Rebuild After Making Changes

If you modify navigation links in `SideNavData.ts` or styling in `SideNavRenderer.ts`, run:

```bash
npm run build
```

This compiles TypeScript and regenerates the `.sppkg` package file in `sharepoint/solution/`.
